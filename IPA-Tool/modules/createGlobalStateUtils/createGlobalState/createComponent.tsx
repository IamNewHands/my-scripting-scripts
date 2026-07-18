import { ProgressView } from "scripting";
import { AsyncComponentProps, AsyncStatus } from "../types";
import { AnimText } from "../../../components/AnimText"

/**
 * 创建异步组件渲染函数
 * @param status 任务状态
 * @param error 错误信息
 * @returns 组件渲染函数
 */
export const createComponent = <State,>(status: AsyncStatus, state: State) => {
  return (props: AsyncComponentProps) => {
    // 根据状态渲染不同的组件
    switch (status) {
      case "pending":
        return (
          <ProgressView
            label={
              typeof props.loading === "string" || !props.loading ? (
                <AnimText>{props.loading ?? "...加载中"}</AnimText>
              ) : (
                props.loading
              )
            }
            progressViewStyle="circular"
          />
        );

      case "fulfilled":
        // 成功状态
        return props.children || <AnimText>已完成</AnimText>;

      case "rejected":
        // 错误状态
        return props.error ? (
          props.error(state?.toString())
        ) : (
          <AnimText foregroundStyle="red">{state?.toString() || "未知错误"}</AnimText>
        );
    }
  };
};
