/**
 * File: pages/Settings/index.tsx
 *
 * 设置页面 - iOS 风格登录
 * 简洁优雅的登录界面
 */

import {
  NavigationStack,
  NavigationLink,
  Navigation,
  Image,
  VStack,
  ZStack,
  HStack,
  useState,
  useEffect,
  useRef,
} from "scripting";

import { useAuth } from "../../hooks/useAuth";
import { useLoginToast } from "../../hooks/useLoginToast";
import { useLoginHandler } from "../../hooks/useLoginHandler";
import { switchTab, Tab } from "../../hooks/useTabs";
import CloseScriptButton from "../../components/CloseScriptButton";
import MinimizeButton from "../../components/MinimizeButton";
import { PageBackground } from "../../components/EditableGlassListPipeline";
import ConfigView from "./Config";
import GlassLoginView, { LoginSuccessView } from "./Login";

/**
 * 设置页面组件
 */
export const SettingsView = () => {
  const { authState, login } = useAuth();
  const { isLoggedIn } = authState;
  const { toastConfig, showToast } = useLoginToast();
  const { handleLogin } = useLoginHandler(login, showToast);
  const [scroll, setScroll] = useState(isLoggedIn);
  // 记录初始登录态，只在「从未登录 → 登录成功」时自动切回搜索页
  const wasLoggedInRef = useRef(isLoggedIn);

  useEffect(() => {
    if (isLoggedIn && !wasLoggedInRef.current) {
      switchTab(Tab.Search);
    }
    wasLoggedInRef.current = isLoggedIn;
  }, [isLoggedIn]);

  useEffect(() => {
    withAnimation(() => setScroll(isLoggedIn));
  }, [isLoggedIn]);

  return (
    <NavigationStack>
      <ZStack frame={{ maxWidth: "infinity", maxHeight: "infinity" }}>
        <PageBackground />
        <VStack
          navigationTitle="Login"
          navigationBarTitleDisplayMode="automatic"
          toast={toastConfig}
          toolbar={{
            topBarLeading: (
              <HStack spacing={15}>
                <MinimizeButton />
                <CloseScriptButton />
              </HStack>
            ),
            topBarTrailing: (
              <NavigationLink
                destination={<ConfigView dismiss={Navigation.useDismiss()} />}
              >
                <Image systemName="gear" />
              </NavigationLink>
            ),
          }}
          frame={{ maxWidth: "infinity", maxHeight: "infinity" }}
        >
          {!scroll ? (
            <GlassLoginView
              onLogin={handleLogin}
              toastConfig={toastConfig}
              showToast={showToast}
              transition={Transition.pushFrom("top")}
            />
          ) : (
            <VStack
              spacing={24}
              padding={16}
              frame={{ maxWidth: "infinity", maxHeight: "infinity" }}
              transition={Transition.pushFrom("bottom")}
            >
              <LoginSuccessView />
            </VStack>
          )}
        </VStack>
      </ZStack>
    </NavigationStack>
  );
};

export default SettingsView;
