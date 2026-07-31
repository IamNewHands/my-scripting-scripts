/**
 * File: hooks/useLoginToast.ts
 *
 * Toast 状态管理 Hook
 * 封装 Toast 的显示逻辑、状态管理和配置
 */

import { useState, useCallback, useMemo, useRef, type Color } from "scripting";
import { Toast } from "../components/Toast";
import type { ToastType } from "../components/Toast";

/**
 * Toast 状态类型
 */
export type ToastState = {
  type: ToastType;
  message: string;
  show: boolean;
};

/**
 * Toast Hook 返回值类型
 */
export interface UseLoginToastReturn {
  toastConfig: {
    duration: number | null;
    position: "center";
    backgroundColor: Color;
    cornerRadius: number;
    shadowRadius: number;
    isPresented: boolean;
    onChanged: (value: boolean) => void;
    content: JSX.Element;
  };
  showToast: (type: ToastType, message: string) => void;
  /** 立即关闭任意 toast */
  hideToast: () => void;
  /** 仅关闭 loading，保留 success/error 短提示 */
  hideLoadingToast: () => void;
  getToastType: () => ToastType | undefined;
}

/**
 * Toast 状态管理 Hook
 * @returns 返回 toast 配置对象和显示方法
 */
export const useLoginToast = (): UseLoginToastReturn => {
  const [toast, setToast] = useState<ToastState>({
    type: "loading",
    message: "",
    show: false,
  });
  // ref 同步当前类型，供 scenePhase 回前台时判断
  const toastTypeRef = useRef<ToastType | undefined>(undefined);

  const showToast = useCallback((type: ToastType, message: string) => {
    toastTypeRef.current = type;
    setToast({ type, message, show: true });
  }, []);

  // 完整重置，避免只改 show 时 content 仍是旧 loading 文案
  const hideToast = useCallback(() => {
    toastTypeRef.current = undefined;
    setToast({ type: "info", message: "", show: false });
  }, []);

  const hideLoadingToast = useCallback(() => {
    if (toastTypeRef.current === "loading") {
      toastTypeRef.current = undefined;
      setToast({ type: "info", message: "", show: false });
    }
  }, []);

  const getToastType = useCallback(() => toastTypeRef.current, []);

  const toastConfig = useMemo(() => {
    return {
      // loading 兜底；成功/失败短显
      duration: toast.type === "loading" ? 12 : 1.4,
      position: "center" as const,
      backgroundColor: "clear" as const,
      cornerRadius: 12,
      shadowRadius: 0,
      isPresented: toast.show,
      onChanged: (show: boolean) => {
        if (!show) {
          toastTypeRef.current = undefined;
          setToast({ type: "info", message: "", show: false });
          return;
        }
        setToast(prev => ({ ...prev, show }));
      },
      content: <Toast {...toast} />,
    };
  }, [toast]);

  return {
    toastConfig,
    showToast,
    hideToast,
    hideLoadingToast,
    getToastType,
  };
};
