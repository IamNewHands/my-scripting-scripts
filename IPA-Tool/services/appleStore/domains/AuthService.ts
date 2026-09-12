import type { RedirectRequest } from "scripting";
import { AppResources } from "../../../constants/AppResources";
import { AppConfig } from "../../../constants/AppConfig";
import { formatAccountName } from "../../tool";
import { getMac, request } from "../runtime";
import { plist } from "../../../utils/plist";
import { APPLE_COMMON_HEADERS } from "../runtime/appleHeaders";
import { LoginError } from "../runtime/errors";
import signSap from "../../../web-sap-signer";

export type LoginParams = {
  appleId: string;
  password: string;
  code?: string;
};

export type AppleLoginResponse = {
  accountInfo?: {
    appleId?: string;
    address?: {
      firstName?: string;
      lastName?: string;
    };
  };
  password?: string;
  Cookie?: string;
  storeFront?: string;
  storeFrontAll?: string;
  dsPersonId?: string;
  passwordToken?: string;
  failureType?: string;
  customerMessage?: string;
};

export type AuthSessionSummary = {
  account: string;
  username: string;
  storeFront: string;
};

const loginKey = AppResources.appleStoreLogin;

/** 读取登录响应中的 Apple ID。 */
const getAppleId = (session: AppleLoginResponse | null | undefined) =>
  session?.accountInfo?.appleId;

/** 读取唯一的 Apple 登录会话数组。 */
const getLoginSessions = () =>
  Storage.get<AppleLoginResponse[]>(loginKey) ?? [];

/** 保存完整的 Apple 登录会话数组。 */
const saveLoginSessions = (sessions: AppleLoginResponse[]) =>
  Storage.set(loginKey, sessions);

/** 返回当前排在首位的活动会话。 */
const getActiveLogin = () => getLoginSessions()[0];

/** 将登录结果置为活动会话，并按 Apple ID 去重。 */
const upsertActiveLogin = (session: AppleLoginResponse) => {
  const appleId = getAppleId(session);
  if (!appleId) throw new LoginError("❌登录响应缺少 Apple ID");

  const sessions = getLoginSessions();
  saveLoginSessions([
    session,
    ...sessions.filter(item => getAppleId(item) !== appleId),
  ]);
  return session;
};

/** 返回会话在账号列表中展示的名称。 */
const getDisplayName = (session: AppleLoginResponse) => {
  const account = getAppleId(session);
  const address = session.accountInfo?.address;
  return (
    formatAccountName(address?.firstName, address?.lastName) || account || ""
  );
};

/** 将完整登录会话转换为公开账号摘要。 */
const toSessionSummary = (
  session: AppleLoginResponse
): AuthSessionSummary | null => {
  const account = getAppleId(session);
  if (!account) return null;
  return {
    account,
    username: getDisplayName(session),
    storeFront: session.storeFront ?? "",
  };
};

/** 校验 Apple 登录协议结果并抛出可识别的登录错误。 */
const validateLogin = (
  loginResponse: AppleLoginResponse | null | undefined
) => {
  if (!loginResponse) throw new LoginError("❌未登录, 请先登录");
  if (!loginResponse.accountInfo && !loginResponse.customerMessage) {
    throw new LoginError("❌缓存数据异常， 请重新登陆");
  }
  if (Object.hasOwn(loginResponse, "failureType")) {
    throw new LoginError(
      [
        "❌登录失败",
        loginResponse.failureType,
        loginResponse.customerMessage,
      ].join(",")
    );
  }
};

export class AuthService {
  /** 向 Apple 登录接口提交凭据并保存新的活动会话。 */
  static async #authenticate({
    appleId,
    password,
    code,
  }: LoginParams): Promise<AppleLoginResponse> {
    const data = {
      appleId,
      attempt: 1,
      guid: getMac(),
      password: `${password}${code ?? ""}`,
      rmp: 0,
      why: "signIn",
    };

    const body = String(plist.build(data));

    const loginSapSignature = await signSap(
      body,
      AppConfig.experimental.sapSignCache,
    );

    const headers = {
      ...APPLE_COMMON_HEADERS,
      "x-apple-actionsignature": loginSapSignature,
    };

    const firstUrl = `https://p37-buy.itunes.apple.com/WebObjects/MZFinance.woa/wa/authenticate`;
    let redirectRequest: RedirectRequest | undefined;
    const options = {
      method: "POST",
      body,
      headers,
      handleRedirect: async (nextRequest: RedirectRequest) => {
        redirectRequest = nextRequest;
        return null;
      },
    };

    let response = await request(firstUrl, options);
    if (response.status === 302) {
      if (!redirectRequest?.url) throw new LoginError("❌登录重定向地址为空");
      response = await request(redirectRequest.url, {
        method: options.method,
        body,
        headers,
      });
    }

    const parsed = plist.parse(await response.text()) as AppleLoginResponse;
    validateLogin(parsed);

    const session: AppleLoginResponse = {
      ...parsed,
      dsPersonId:
        parsed.dsPersonId === undefined ? undefined : String(parsed.dsPersonId),
      password,
      Cookie: response.headers.get("set-cookie") ?? undefined,
      storeFront: response.headers
        .get("x-set-apple-store-front")
        ?.split("-")[0],
      storeFrontAll: response.headers.get("x-set-apple-store-front") ?? undefined,
    };

    return upsertActiveLogin(session);
  }

  /** 返回可用活动会话，必要时使用传入凭据重新登录。 */
  static async login(params?: LoginParams): Promise<AppleLoginResponse> {
    const active = getActiveLogin();
    if (
      params &&
      (!active ||
        params.appleId !== getAppleId(active) ||
        params.password !== active.password)
    ) {
      return this.#authenticate(params);
    }
    validateLogin(active);
    return active!;
  }

  /** 返回全部缓存账号的展示摘要。 */
  static getSessions(): AuthSessionSummary[] {
    return getLoginSessions()
      .map(toSessionSummary)
      .filter((item): item is AuthSessionSummary => !!item);
  }

  /** 将指定缓存账号切换为活动会话。 */
  static switchSession(account: string): AuthSessionSummary[] {
    const sessions = getLoginSessions();
    const index = sessions.findIndex(item => getAppleId(item) === account);
    if (index < 0) throw new LoginError("❌未找到缓存账号，请重新登录");

    const [target] = sessions.splice(index, 1);
    sessions.unshift(target);
    saveLoginSessions(sessions);
    return this.getSessions();
  }

  /** 删除指定缓存账号并返回剩余账号摘要。 */
  static removeSession(account: string): AuthSessionSummary[] {
    const sessions = getLoginSessions();
    const nextSessions = sessions.filter(item => getAppleId(item) !== account);
    if (nextSessions.length === sessions.length)
      throw new LoginError("❌未找到要删除的缓存账号");

    saveLoginSessions(nextSessions);
    return this.getSessions();
  }

  /** 使用活动账号保存的凭据刷新 Apple Cookie。 */
  static async refreshCookie(): Promise<AppleLoginResponse> {
    const { accountInfo, password } = getActiveLogin() ?? {};
    const appleId = accountInfo?.appleId;
    if (!appleId || !password)
      throw new LoginError("❌未登录,刷新Cookie失败,请重新登录");
    return this.#authenticate({ appleId, password });
  }
}
