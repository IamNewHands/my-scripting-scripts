import { AbortController, Path, fetch } from "scripting";
import { EventBus } from "../EventBus";

import type {
  DownloadTaskStartCallback,
  DownloadStatus,
  DownloadProgressCallback,
  DownloadTaskEndCallback,
  DownloadTaskFailedCallback,
  DownloadTaskFinallyCallback,
  DownloadTaskOptions,
  DownloadFailedError,
} from "./types";

const DEFAULT_FETCH_TIMEOUT_SECONDS = 10;

const createAbortError = (message: DownloadStatus) => {
  const error = new Error(message);
  error.name = "AbortError";
  return error;
};

class DownloadAbortController extends AbortController {
  abort(
    status: Exclude<DownloadStatus, "downloading" | "pending" | "fetching">
  ) {
    super.abort(createAbortError(status));
  }
}

const getTotalSize = (
  resp: { headers: { get: (key: string) => string | null } },
  downloadedSize: number
) => {
  const rangeTotal = resp.headers.get("content-range")?.match(/\/(\d+)$/)?.[1];
  return rangeTotal
    ? Number(rangeTotal)
    : downloadedSize + Number(resp.headers.get("content-length") ?? 0);
};

export class DownloadTask {
  static #rootDir = FileManager.documentsDirectory;

  private bus = new EventBus();
  #controller = new DownloadAbortController();
  downloadedSize = 0;
  status: DownloadStatus = "pending";
  id: string;
  totalSize?: number;
  url: string;
  name: string;
  folder: string;
  timeout: number;

  /**
   * 初始化下载请求
   * @param options 下载任务配置选项
   */
  constructor(options: Omit<DownloadTaskOptions, "totalSize">);
  /**
   * 断点续传初始化下载请求
   * @param options 下载任务配置选项
   */
  constructor(
    options: Omit<DownloadTaskOptions, "totalSize"> &
      Required<Pick<DownloadTaskOptions, "totalSize">>
  );

  constructor(options: DownloadTaskOptions) {
    this.id = options.id;
    this.totalSize = options.totalSize;
    this.url = options.url;
    this.name = options.name;
    this.folder = options.folder;
    this.timeout = options.timeout ?? DEFAULT_FETCH_TIMEOUT_SECONDS;
  }

  /**
   * 下载逻辑
   * @returns 下载任务实例
   */
  start(isRun = true): this {
    if (!isRun) return this;

    if (this.status === "downloading") {
      this.cancel();
      return this;
    }

    this.#controller = new DownloadAbortController();
    Promise.try(async () => {
      this.bus.emit("downloadStart", this.status, this);
      this.status = "fetching";
      this.bus.emit("downloadStatusChange", "fetching");

      this.downloadedSize = await this.appSize();
      if ((this.status as DownloadStatus) === "cancelled")
        throw createAbortError("cancelled");

      const resp = await fetch(this.url, {
        signal: this.#controller.signal,
        timeout: this.timeout,
        headers: { Range: `bytes=${this.downloadedSize}-` },
      });
      this.totalSize ??= getTotalSize(resp, this.downloadedSize);

      const filePath = await this.#appFilePath();

      // 验证响应状态码
      if (!resp.ok) {
        throw new Error(`下载错误 HTTP ${resp.status}`);
      }

      // 验证 Range 请求成功
      if (this.downloadedSize > 0 && resp.status !== 206) {
        throw new Error("断点续传请求失败, 请删除下载文件后重新下载");
      }

      for await (const chunk of resp.dataStream) {
        if (this.status === "fetching") {
          this.status = "downloading";
          this.bus.emit("downloadStatusChange", "downloading");
        }

        if (this.status !== "downloading") {
          throw Object.assign({status: this.status ?? "failed"}, new Error("下载失败"))
        }

        await FileManager.appendData(filePath, chunk);
        this.downloadedSize += chunk.size;
        this.bus.emit("downloadProgress", {
          downloaded: this.downloadedSize,
          total: this.totalSize,
          percent: Number((this.downloadedSize / this.totalSize).toFixed(2)),
        });
      }

      this.status = "completed";
    })
      .then(() => {
        this.bus.emit("downloadEnd", this.status);
      })
      .catch((err: DownloadFailedError) => {
        if (err.name === "AbortError") {
          this.status = err.message.replaceAll("AbortError: ","") as DownloadStatus;
          
          console.log("触发",this.status)
          this.bus.emit("downloadCancel", this.status);
          console.log("下载任务取消：", err.toString());
        } else {
          this.status = err.status ?? "failed";
          this.bus.emit("downloadFailed", this.status, err);
          console.log("下载任务失败：", err.toString());
        }
      })
      .finally(() => {
        this.bus.emit("downloadFinally", this.status, this);
        this.bus.emit("downloadStatusChange", this.status);
      });

    return this;
  }

  /**
   * 取消下载任务
   */
  cancel(): void {
    if (!["fetching", "downloading"].includes(this.status)) return;
    this.status = "cancelled";
    this.#controller.abort("cancelled");
    console.log("取消下载任务", this.name);
  }

  /**
   * 删除下载任务
   */
  remove(options: { emitRemove?: boolean } = {}): void {
    this.status = "deleted";
    this.#controller.abort("deleted");
    this.#appFilePath().then(filePath => {
      if (FileManager.existsSync(filePath)) FileManager.remove(filePath);
      this.bus.emit("downloadDispose", this);
      if (options.emitRemove !== false)
        this.bus.emit("downloadRemove", "deleted");
      this.dispose();
      console.log("删除下载任务", this.name);
    });
  }

  /**
   * 清理任务资源（清空所有事件监听器）
   * 通常在任务从管理器中移除时调用
   */
  dispose(): void {
    this.bus.clear();
  }

  /**
   * 获取应用安装包文件路径
   * @returns 应用安装包存件路径
   */
  async #appFilePath(): Promise<string> {
    const dir = Path.join(DownloadTask.#rootDir, this.folder);
    await FileManager.createDirectory(dir, true);

    return DownloadTask.filePath({ ...this });
  }

  /**
   * 同步构造文件路径（供外部检查文件存在性使用）
   */
  static filePath({
    folder,
    id,
    name,
  }: {
    folder: string;
    id: string;
    name: string;
  }) {
    return Path.join(this.#rootDir, folder, `${id}-${name}`);
  }

  /**
   * 获取应用安装包大小
   * @returns 应用安装包大小（单位：字节）
   */
  async appSize(): Promise<number> {
    try {
      const stat = await FileManager.stat(await this.#appFilePath());
      return stat.size;
    } catch {
      return 0;
    }
  }

  /**
   * 注册下载取消hook
   * @param cb 下载取消回调函数
   * @returns 返回当前实例，支持链式调用
   */
  onCancel(cb: (status: "pending") => void): this {
    this.bus.on("downloadCancel", cb);
    return this;
  }

  /**
   * 移除下载取消hook
   * @param cb 下载取消回调函数
   * @returns 返回当前实例，支持链式调用
   */
  offCancel(cb: (status: "pending") => void): this {
    this.bus.off("downloadCancel", cb);
    return this;
  }

  /**
   * 注册下载删除hook
   * @param cb 下载删除回调函数
   * @returns 返回当前实例，支持链式调用
   */
  onRemove(cb: (status: "deleted") => void): this {
    this.bus.on("downloadRemove", cb);
    return this;
  }

  /**
   * 移除下载删除hook
   * @param cb 下载删除回调函数
   * @returns 返回当前实例，支持链式调用
   */
  offRemove(cb: (status: "deleted") => void): this {
    this.bus.off("downloadRemove", cb);
    return this;
  }

  /**
   * 下载执行前的hook
   * @param cb 下载开始前回调函数
   * @returns 返回当前实例，支持链式调用
   */
  onStart(cb: DownloadTaskStartCallback): this {
    this.bus.on("downloadStart", cb);
    return this;
  }

  /**
   * 移除下载执行前的hook
   * @param cb 下载开始前回调函数
   * @returns 返回当前实例，支持链式调用
   */
  offStart(cb: DownloadTaskStartCallback): this {
    this.bus.off("downloadStart", cb);
    return this;
  }

  /**
   * 注册下载进度hook
   * @param cb 下载进度回调函数
   * @returns 返回当前实例，支持链式调用
   */
  onProgress(cb: DownloadProgressCallback): this {
    this.bus.on("downloadProgress", cb);
    return this;
  }

  /**
   * 移除下载进度hook
   * @param cb 下载进度回调函数
   * @returns 返回当前实例，支持链式调用
   */
  offProgress(cb: DownloadProgressCallback): this {
    this.bus.off("downloadProgress", cb);
    return this;
  }

  /**
   * 注册下载任务完成hook
   * @param cb 下载（成功）回调函数
   * @returns 返回当前实例，支持链式调用
   */
  onEnd(cb: DownloadTaskEndCallback): this {
    this.bus.on("downloadEnd", cb);
    return this;
  }

  /**
   * 移除下载任务完成hook
   * @param cb 下载（成功）回调函数
   * @returns 返回当前实例，支持链式调用
   */
  offEnd(cb: DownloadTaskEndCallback): this {
    this.bus.off("downloadEnd", cb);
    return this;
  }

  /**
   * 注册下载任务失败hook
   * @param cb 下载（失败）回调函数
   * @returns 返回当前实例，支持链式调用
   */
  onFailed(cb: DownloadTaskFailedCallback): this {
    this.bus.on("downloadFailed", cb);
    return this;
  }

  /**
   * 移除下载任务失败hook
   * @param cb 下载（失败）回调函数
   * @returns 返回当前实例，支持链式调用
   */
  offFailed(cb: DownloadTaskFailedCallback): this {
    this.bus.off("downloadFailed", cb);
    return this;
  }

  /**
   * 注册下载任务完成（无论成功或失败）hook
   * @param cb 下载（完成）回调函数
   * @returns 返回当前实例，支持链式调用
   */
  onFinally(cb: DownloadTaskFinallyCallback): this {
    this.bus.on("downloadFinally", cb);
    return this;
  }

  /**
   * 移除下载任务完成（无论成功或失败）hook
   * @param cb 下载（完成）回调函数
   * @returns 返回当前实例，支持链式调用
   */
  offFinally(cb: DownloadTaskFinallyCallback): this {
    this.bus.off("downloadFinally", cb);
    return this;
  }

  /**
   * 监听任务状态变化
   * @param cb 任务状态变化回调函数
   * @returns 返回当前实例，支持链式调用
   */
  onStatusChange(cb: (status: DownloadStatus) => void): this {
    this.bus.on("downloadStatusChange", cb);
    return this;
  }

  /**
   * 移除任务状态变化hook
   * @param cb 任务状态变化回调函数
   * @returns 返回当前实例，支持链式调用
   */
  offStatusChange(cb: (status: DownloadStatus) => void): this {
    this.bus.off("downloadStatusChange", cb);
    return this;
  }

  /** 监听任务内部释放。该事件属于下载库生命周期，remove 时永远触发，不受 emitRemove 控制。 */
  onDispose(cb: (task: this) => void): this {
    this.bus.on("downloadDispose", cb);
    return this;
  }

  /** 移除任务内部释放监听。 */
  offDispose(cb: (task: this) => void): this {
    this.bus.off("downloadDispose", cb);
    return this;
  }
}
