/**
 * 文件：scripts/ipaTool/utils/loginHistoryStorage.ts
 * 说明：历史登录账号信息存储工具
 */

import { AppConfig } from "../constants/AppConfig";

/**
 * 账户历史记录接口。
 * 密码不存 Storage，改用 Keychain（keychain:loginPassword:<account>）。
 */
interface AccountHistory {
  account: string;
  username: string;
  lastLogin: string;
  storeFront: string;
  isActive?: boolean;
}

/**
 * 历史登录账号列表
 */
type LoginHistory = AccountHistory[];

/**
 * 获取所有历史登录账号
 */
export const getAll = (): LoginHistory => {
  return Storage.get<LoginHistory>(AppConfig.storageKeys.loginHistory) ?? [];
};

/**
 * 保存历史登录账号列表
 */
const save = (history: LoginHistory) => {
  Storage.set<LoginHistory>(AppConfig.storageKeys.loginHistory, history);
  return history;
};

/**
 * 新增历史登录账号
 * @param account 账号信息
 */
export const add = (account: AccountHistory) => {
  const history = getAll();

  if (account.isActive) {
    history.forEach(item => {
      if (item.isActive) delete item.isActive;
    });
  }

  const index = history.findIndex(item => item.account === account.account);
  if (index > -1) {
    history[index] = account;
  } else {
    history.push(account);
  }

  return save(history);
};

/**
 * 获取当前使用的账户信息
 * @returns 当前激活的账户信息，如果没有则返回 undefined
 */
export const getActive = (): AccountHistory | undefined => {
  const history = getAll();
  return history.find(item => item.isActive);
};

/**
 * 修改账户属性
 * @param account 账户标识（用于查找）
 * @param updates 要更新的字段
 */
export const update = (
  account: string,
  cb: (account?: AccountHistory) => void
) => {
  const history = getAll();
  const accountItem = history.find(item => item.account === account);
  cb(accountItem);
  return save(history);
};

/**
 * 将指定账号标记为当前激活账号。
 * 只更新 login_history 的 UI 当前账号状态，不处理后端 CK。
 */
export const setActive = (account: string) => {
  const history = getAll();
  const index = history.findIndex(item => item.account === account);
  if (index < 0) return save(history);

  const [activeAccount] = history.splice(index, 1);
  const nextHistory = [
    { ...activeAccount, isActive: true },
    ...history.map(item => {
      const { isActive, ...rest } = item;
      return rest;
    }),
  ];

  return save(nextHistory);
};

/**
 * 删除历史登录账号。
 * 如果删除的是当前激活账号，会自动把剩余第一项设为激活账号。
 */
export const remove = (account: string) => {
  const history = getAll();
  const removed = history.find(item => item.account === account);
  const nextHistory = history.filter(item => item.account !== account);

  if (removed?.isActive && nextHistory.length > 0) {
    nextHistory.forEach((item, index) => {
      if (index === 0) item.isActive = true;
      else if (item.isActive) delete item.isActive;
    });
  }

  // 同时清理 Keychain 中的密码
  deletePassword(account);
  return save(nextHistory);
};

// ─── Keychain 读写密码（不落 Storage） ───

const passwordKey = (account: string) => `loginPassword:${account}`

/** 将密码写入 Keychain（加密存储，Storage 管理器不可见）。 */
export const savePassword = (account: string, password: string) => {
  Keychain.set(passwordKey(account), password)
}

/** 从 Keychain 读取密码。若不存在返回 null。 */
export const getPassword = (account: string): string | null => {
  return Keychain.get(passwordKey(account))
}

/** 从 Keychain 删除密码。 */
export const deletePassword = (account: string) => {
  Keychain.remove(passwordKey(account))
}
