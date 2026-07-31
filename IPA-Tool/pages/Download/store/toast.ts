import type { ToastType } from "../../../components/Toast"

export const onDownloadShowToast = {
  run: (_type: ToastType, _message: string) => {},
  hide: () => {},
  /** 仅关 loading，保留 success/error */
  hideLoading: () => {},
}
