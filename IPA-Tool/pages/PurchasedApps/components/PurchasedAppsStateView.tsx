import {
  Button,
  ContentUnavailableView,
  Image,
  ProgressView,
  VStack,
} from "scripting";
import { AnimText } from "../../../components/AnimText";
import type { PurchaseHistoryStatus } from "../model/types";

type PurchasedAppsStateViewProps = {
  status: Exclude<PurchaseHistoryStatus, "ready">;
  error: string;
  onRetry: () => void;
};

/** 显示购买历史的等待、空数据和失败状态。 */
export default function PurchasedAppsStateView({
  status,
  error,
  onRetry,
}: PurchasedAppsStateViewProps) {
  if (status === "loading") {
    return (
      <ContentUnavailableView
        key="loading"
        transition={Transition.opacity()}
        label={
          <VStack spacing={12}>
            <ProgressView progressViewStyle="circular" controlSize="large" />
            <AnimText font="title2" fontWeight="semibold">
              正在加载已购项目
            </AnimText>
          </VStack>
        }
        description={
          <AnimText font="body" foregroundStyle="secondaryLabel">
            正在读取当前账号的购买历史
          </AnimText>
        }
      />
    );
  }

  if (status === "unauthenticated") {
    return (
      <ContentUnavailableView
        key="unauthenticated"
        transition={Transition.opacity()}
        title="尚未登录"
        systemImage="person.crop.circle"
        description="登录 Apple 账号后查看已购项目"
      />
    );
  }

  if (status === "empty") {
    return (
      <ContentUnavailableView
        key="empty"
        transition={Transition.opacity()}
        title="暂无已购APP"
        systemImage="shippingbox"
        description="当前账号没有可显示的 App 购买记录"
      />
    );
  }

  return (
    <ContentUnavailableView
      key="error"
      transition={Transition.opacity()}
      label={
        <VStack spacing={12}>
          <Image
            systemName="exclamationmark.triangle"
            font={48}
            foregroundStyle="systemOrange"
          />
          <AnimText font="title2" fontWeight="semibold">
            加载失败
          </AnimText>
        </VStack>
      }
      description={
        <AnimText font="body" foregroundStyle="secondaryLabel">
          {error}
        </AnimText>
      }
      actions={[
        <Button
          key="retry"
          title="重新加载"
          systemImage="arrow.clockwise"
          buttonStyle="borderedProminent"
          action={onRetry}
        />,
      ]}
    />
  );
}
