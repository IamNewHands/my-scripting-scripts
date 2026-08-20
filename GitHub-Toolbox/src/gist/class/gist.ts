import { fetch, RequestInit } from "scripting";

// 元数据存 Storage（仅 id/名称/login）；密钥按档案 id 存 Keychain
const PROFILES_STORAGE_KEY = "gist_profiles_v1";
const LEGACY_TOKEN_KEYCHAIN = "gist_token";
const LEGACY_STORAGE_KEY = "gist";

export type GistProfileMeta = {
  id: string;
  name: string;
  /** GitHub login，可选展示用 */
  login?: string;
};

type ProfilesState = {
  activeId: string | null;
  profiles: GistProfileMeta[];
};

function tokenKey(id: string) {
  return `gist_token_${id}`;
}

function newId() {
  return `${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function readState(): ProfilesState {
  const raw = Storage.get<ProfilesState>(PROFILES_STORAGE_KEY);
  if (raw && Array.isArray(raw.profiles)) {
    return {
      activeId: raw.activeId ?? null,
      profiles: raw.profiles.filter((p) => p && typeof p.id === "string" && typeof p.name === "string"),
    };
  }
  return { activeId: null, profiles: [] };
}

function writeState(state: ProfilesState) {
  Storage.set(PROFILES_STORAGE_KEY, {
    activeId: state.activeId,
    profiles: state.profiles.map((p) => ({
      id: p.id,
      name: p.name,
      ...(p.login ? { login: p.login } : {}),
    })),
  });
}

class Gist {
  /** 当前激活档案的 Token（内存）；勿打印 */
  token: string = "";
  activeId: string | null = null;
  profiles: GistProfileMeta[] = [];

  constructor() {
    this.migrateAndLoad();
  }

  get activeProfile(): GistProfileMeta | null {
    if (!this.activeId) return null;
    return this.profiles.find((p) => p.id === this.activeId) ?? null;
  }

  get activeName(): string {
    return this.activeProfile?.name || "未选择档案";
  }

  hasToken(): boolean {
    return Boolean((this.token || "").trim());
  }

  private migrateAndLoad() {
    let state = readState();

    // 迁移：旧单 Token Keychain / Storage → 默认档案
    if (state.profiles.length === 0) {
      let legacy =
        Keychain.get(LEGACY_TOKEN_KEYCHAIN) ||
        (typeof Storage.get<string>(LEGACY_STORAGE_KEY) === "string"
          ? Storage.get<string>(LEGACY_STORAGE_KEY) || ""
          : "");
      legacy = (legacy || "").trim();
      if (legacy) {
        const id = newId();
        Keychain.set(tokenKey(id), legacy);
        Keychain.remove(LEGACY_TOKEN_KEYCHAIN);
        Storage.remove(LEGACY_STORAGE_KEY);
        state = {
          activeId: id,
          profiles: [{ id, name: "默认" }],
        };
        writeState(state);
      }
    } else {
      // 清理可能残留的旧明文
      Storage.remove(LEGACY_STORAGE_KEY);
    }

    this.profiles = state.profiles;
    this.activeId = state.activeId;
    if (this.activeId && !this.profiles.some((p) => p.id === this.activeId)) {
      this.activeId = this.profiles[0]?.id ?? null;
      writeState({ activeId: this.activeId, profiles: this.profiles });
    }
    this.token = this.activeId ? Keychain.get(tokenKey(this.activeId)) || "" : "";
  }

  private persistMeta() {
    writeState({ activeId: this.activeId, profiles: this.profiles });
  }

  private setActiveTokenFromKeychain() {
    this.token = this.activeId ? Keychain.get(tokenKey(this.activeId)) || "" : "";
  }

  listProfiles(): GistProfileMeta[] {
    return this.profiles.slice();
  }

  /** 切换当前档案；成功返回 true */
  switchProfile(id: string): boolean {
    if (!this.profiles.some((p) => p.id === id)) return false;
    this.activeId = id;
    this.persistMeta();
    this.setActiveTokenFromKeychain();
    return true;
  }

  /**
   * 添加档案。name/token 必填。
   * 会请求 /user 校验 Token，并用 login 补全展示信息；失败仍可保存（仅提示）。
   */
  async addProfile(input: { name: string; token: string }): Promise<GistProfileMeta> {
    const name = (input.name || "").trim();
    const token = (input.token || "").trim();
    if (!name) throw "请填写档案名称";
    if (!token) throw "请填写 Token";

    const id = newId();
    let login: string | undefined;
    try {
      login = await this.fetchLogin(token);
    } catch {
      // 校验失败仍允许保存，用户可稍后改
    }

    Keychain.set(tokenKey(id), token);
    const meta: GistProfileMeta = { id, name, ...(login ? { login } : {}) };
    this.profiles = [...this.profiles, meta];
    this.activeId = id;
    this.token = token;
    this.persistMeta();
    // 旧单键清理
    Keychain.remove(LEGACY_TOKEN_KEYCHAIN);
    Storage.remove(LEGACY_STORAGE_KEY);
    return meta;
  }

  /** 更新档案名 / Token（token 空则保留原密钥） */
  async updateProfile(
    id: string,
    input: { name?: string; token?: string },
  ): Promise<GistProfileMeta> {
    const idx = this.profiles.findIndex((p) => p.id === id);
    if (idx < 0) throw "档案不存在";

    const current = this.profiles[idx];
    const name = input.name !== undefined ? input.name.trim() : current.name;
    if (!name) throw "请填写档案名称";

    let login = current.login;
    const nextToken = input.token !== undefined ? input.token.trim() : undefined;
    if (nextToken !== undefined) {
      if (!nextToken) throw "Token 不能为空";
      try {
        login = await this.fetchLogin(nextToken);
      } catch {
        // 忽略，仍写入
      }
      Keychain.set(tokenKey(id), nextToken);
      if (this.activeId === id) this.token = nextToken;
    }

    const meta: GistProfileMeta = { id, name, ...(login ? { login } : {}) };
    const next = this.profiles.slice();
    next[idx] = meta;
    this.profiles = next;
    this.persistMeta();
    return meta;
  }

  /** 删除档案及其 Keychain 密钥 */
  deleteProfile(id: string) {
    if (!this.profiles.some((p) => p.id === id)) return;
    Keychain.remove(tokenKey(id));
    this.profiles = this.profiles.filter((p) => p.id !== id);
    if (this.activeId === id) {
      this.activeId = this.profiles[0]?.id ?? null;
      this.setActiveTokenFromKeychain();
    }
    this.persistMeta();
  }

  /** 用当前 Token 刷新 login 展示 */
  async refreshActiveLogin(): Promise<string | null> {
    if (!this.token || !this.activeId) return null;
    const login = await this.fetchLogin(this.token);
    const idx = this.profiles.findIndex((p) => p.id === this.activeId);
    if (idx >= 0) {
      const p = this.profiles[idx];
      this.profiles = this.profiles.map((x, i) => (i === idx ? { ...p, login } : x));
      this.persistMeta();
    }
    return login;
  }

  private async fetchLogin(token: string): Promise<string> {
    const r = await fetch("https://api.github.com/user", {
      method: "GET",
      headers: {
        Accept: "application/vnd.github+json",
        Authorization: `Bearer ${token}`,
      },
    });
    if (!r.ok) throw r.statusText || "Token 无效";
    const j = (await r.json()) as { login?: string };
    if (!j.login) throw "无法读取用户名";
    return j.login;
  }

  // --- 兼容旧设置页调用：改当前档案 Token 时请用 updateProfile --- //
  /** @deprecated 多档案后请用 addProfile / updateProfile */
  save() {
    if (!this.activeId) return;
    const value = (this.token || "").trim();
    this.token = value;
    if (value) Keychain.set(tokenKey(this.activeId), value);
    else Keychain.remove(tokenKey(this.activeId));
    Storage.remove(LEGACY_STORAGE_KEY);
    Keychain.remove(LEGACY_TOKEN_KEYCHAIN);
  }

  clearToken() {
    if (this.activeId) Keychain.remove(tokenKey(this.activeId));
    this.token = "";
    Storage.remove(LEGACY_STORAGE_KEY);
    Keychain.remove(LEGACY_TOKEN_KEYCHAIN);
  }

  // --- api --- //
  async get() {
    return await this.fetch("https://api.github.com/gists");
  }

  async create(filename: string, content: string, isPublic: boolean, description: string) {
    return await this.fetch("https://api.github.com/gists", {
      method: "POST",
      body: JSON.stringify({
        description: description || "",
        public: isPublic,
        files: {
          [filename]: {
            content: content,
          },
        },
      }),
    });
  }

  async updateContent(url: string, filename: string, content: string) {
    return await this.fetch(url, {
      method: "PATCH",
      body: JSON.stringify({
        files: {
          [filename]: {
            content: content,
          },
        },
      }),
    });
  }

  async deleteContent(url: string, filename: string) {
    return await this.fetch(url, {
      method: "PATCH",
      body: JSON.stringify({
        files: {
          [filename]: null,
        },
      }),
    });
  }

  async updateDescription(url: string, description: string) {
    return await this.fetch(url, {
      method: "PATCH",
      body: JSON.stringify({
        description: description,
      }),
    });
  }

  async getContent(url: string) {
    return await fetch(url, {
      method: "GET",
    }).then((r) => r.text());
  }

  async delete(url: string) {
    return await this.fetch(url, {
      method: "DELETE",
    });
  }

  private async fetch(url: string, init?: RequestInit) {
    if (!this.token) throw "未配置 Token，请先在设置中添加档案";
    return await fetch(url, {
      ...init,
      headers: {
        ...init?.headers,
        Accept: "application/vnd.github+json",
        Authorization: `Bearer ${this.token}`,
      },
    }).then((r) => {
      if (!r.ok) throw r.statusText;
      return r.json();
    });
  }
}

export const gist = new Gist();
