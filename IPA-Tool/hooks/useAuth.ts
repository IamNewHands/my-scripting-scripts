import { createGlobalState } from "../modules/createGlobalStateUtils";
import {
  apiDeleteAuthSession,
  apiGetAuthSessions,
  apiLogin,
  apiSwitchAuthSession,
  type AuthSessionSummary,
} from "../services/api/auth";
import {
  add,
  getActive,
  getAll,
  remove as removeHistory,
  setActive,
  update,
} from "../utils/loginHistoryStorage";

export type AccountHistory = ReturnType<typeof getAll>[number];

const emptyAuthState = {
  isLoggedIn: false,
  account: "",
  username: "",
  password: "",
  storeFront: "",
  lastLogin: "",
};

type Init = typeof emptyAuthState;

const activeAuthState = getActive();
const init = activeAuthState
  ? { ...emptyAuthState, ...activeAuthState, isLoggedIn: true }
  : emptyAuthState;

const useHook = createGlobalState(
  (state, action: (state: Init) => Init) => {
    return { ...state, ...action(state) };
  },
  init,
);

const sessionsHook = createGlobalState(
  (state, action: (state: AuthSessionSummary[]) => AuthSessionSummary[]) => {
    return action(state);
  },
  [] as AuthSessionSummary[],
);

const getAccountId = (account: string | AccountHistory) => {
  return typeof account === "string" ? account : account.account;
};

const getAuthStateFromHistory = (history: ReturnType<typeof getAll>): Init => {
  const active = history.find(item => item.isActive);
  return active
    ? { ...emptyAuthState, ...active, isLoggedIn: true }
    : { ...emptyAuthState };
};

const getActiveAuthState = (): Init => getAuthStateFromHistory(getAll());

export const getAccountHistory = () => getAll();
export const getAuthStateSnapshot = () => useHook.getState() ?? emptyAuthState;
export const getAuthSessionsSnapshot = () => sessionsHook.getState() ?? [];

/**
 * 登录 / 登出基础认证 Hook。
 *
 * 这里保持简单：
 * - login_history 仍由 loginHistoryStorage 负责持久化；
 * - authState 只是用于触发 UI 刷新的响应式当前状态；
 * - 登录、切换、删除成功后统一同步 login_history，再刷新 authState。
 */
export const useAuth = () => {
  const [state, dispatch] = useHook();
  const [authSessions, dispatchSessions] = sessionsHook();
  const getAuthState = getAuthStateSnapshot();

  const syncAuthStateFromHistory = (history: ReturnType<typeof getAll> = getAll()) => {
    const nextState = getAuthStateFromHistory(history);
    dispatch(() => nextState);
    return nextState;
  };

  const refreshAuthSessions = async () => {
    const sessions = await apiGetAuthSessions();
    dispatchSessions(() => sessions);
    return sessions;
  };

  /**
   * 登录账号。
   *
   * 后端负责判断是否复用 CK / 是否真实登录；
   * 成功后前端写入 login_history，并标记为 active。
   */
  const login = async (appleId: string, password: string, code: string) => {
    const data = await apiLogin({ appleId, password, code });
    const history = add({ ...data, password, isActive: true });
    syncAuthStateFromHistory(history);
    await refreshAuthSessions();
  };

  /**
   * 仅更新前端 login_history 的 active 状态。
   * 用于登录页历史账号填表/本地 UI 选择，不操作后端 CK。
   */
  const switchAccount = (account: AccountHistory) => {
    const history = setActive(account.account);
    syncAuthStateFromHistory(history);
  };

  /**
   * 快速切换账号。
   *
   * 成功后同步：
   * 1. 后端 CK session 数组：选中账号移动到首位；
   * 2. 前端 login_history：选中账号标记 isActive；
   * 3. authState：从 login_history active 重新刷新。
   */
  const switchAuthSession = async (account: string | AccountHistory) => {
    const accountId = getAccountId(account);
    const sessions = await apiSwitchAuthSession(accountId);
    dispatchSessions(() => sessions);
    const history = setActive(accountId);
    syncAuthStateFromHistory(history);
    return sessions;
  };

  /**
   * 删除账号。
   *
   * 成功后同步清理：
   * 1. 后端 CK session；
   * 2. 前端 login_history；
   * 3. authState：从 login_history active 重新刷新。
   */
  const deleteAccount = async (account: string | AccountHistory) => {
    const accountId = getAccountId(account);
    const sessions = await apiDeleteAuthSession(accountId);
    dispatchSessions(() => sessions);
    const history = removeHistory(accountId);
    syncAuthStateFromHistory(history);
    return sessions;
  };

  /**
   * 登出当前账号。
   * 只清理前端 active 状态，不删除历史账号，也不删除后端 CK。
   */
  const logout = () => {
    const history = update(state.account, account => {
      if (!account) return;
      delete account.isActive;
    });
    syncAuthStateFromHistory(history);
  };

  return {
    authState: state,
    getAuthState,
    accountHistory: getAccountHistory(),
    authSessions,
    refreshAuthSessions,
    login,
    logout,
    switchAccount,
    switchAuthSession,
    deleteAccount,
  };
};
