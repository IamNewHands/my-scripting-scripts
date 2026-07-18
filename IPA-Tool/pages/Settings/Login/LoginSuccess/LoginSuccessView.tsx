import { Spacer, VStack, useState } from "scripting";
import { useIconAnimation, useQuickSwitchAccount } from "../../../../hooks";
import { useAuth } from "../../../../hooks/useAuth";
import { switchTab, Tab } from "../../../../hooks/useTabs";
import { AccountSelectionSheet } from "../components/AccountSelectionSheet";
import { LoginSuccessAccountSection } from "./LoginSuccessAccountSection";
import { SuccessActions } from "./SuccessActions";
import { SuccessBadge } from "./SuccessBadge";

export const LoginSuccessView = () => {
  const { logout } = useAuth();
  const {
    accounts: quickSwitchAccounts,
    canQuickSwitch,
    isSwitching,
    switchAccount,
  } = useQuickSwitchAccount();
  const { deleteAccount } = useAuth();
  const [accountSheetPresented, setAccountSheetPresented] = useState(false);
  const iconAnimation = useIconAnimation(5, 1, 0);

  const handleQuickSwitch = () => {
    setAccountSheetPresented(true);
  };

  const handleSelectAccount = async (selectedAccount: typeof quickSwitchAccounts[number]) => {
    try {
      await switchAccount(selectedAccount);
    } catch (error) {
      await Dialog.actionSheet({
        title: "快速切换失败",
        message: error instanceof Error ? error.message : String(error),
        actions: [{ label: "知道了" }],
      });
    }
  };

  const handleDeleteAccount = async (selectedAccount: typeof quickSwitchAccounts[number]) => {
    try {
      await deleteAccount(selectedAccount);
    } catch (error) {
      await Dialog.actionSheet({
        title: "删除失败",
        message: error instanceof Error ? error.message : String(error),
        actions: [{ label: "知道了" }],
      });
    }
  };

  return (
    <VStack
      spacing={20}
      alignment="center"
      padding={{ horizontal: 5 }}
      frame={{ maxWidth: "infinity", maxHeight: "infinity" }}
      offset={{ x: 0, y: -30 }}
      sheet={accountSheetPresented ? {
        isPresented: true,
        onChanged: presented => {
          if (!presented) setAccountSheetPresented(false);
        },
        content: (
          <AccountSelectionSheet
            presentationDragIndicator="visible"
            presentationDetents={[quickSwitchAccounts.length > 3 ? 700 : "medium"]}
            accounts={quickSwitchAccounts}
            onSelect={handleSelectAccount}
            onDelete={handleDeleteAccount}
          />
        ),
      } : undefined}
    >
      <Spacer minLength={30} />
      <SuccessBadge {...iconAnimation} />
      <LoginSuccessAccountSection />
      <VStack spacing={10} frame={{ maxWidth: "infinity" }}>
        <SuccessActions
          canSwitch={canQuickSwitch}
          isSwitching={isSwitching}
          onContinue={() => switchTab(Tab.Search)}
          onLogout={logout}
          onSwitchAccount={handleQuickSwitch}
        />
      </VStack>
      <Spacer minLength={8} />
    </VStack>
  );
};
