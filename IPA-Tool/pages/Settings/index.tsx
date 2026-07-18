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
  useState,
  useEffect,
} from "scripting";

import { useAuth } from "../../hooks/useAuth";
import { useLoginToast } from "../../hooks/useLoginToast";
import { useLoginHandler } from "../../hooks/useLoginHandler";
import CloseButton from "../../components/CloseButton";
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
            topBarLeading: <CloseButton />,
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
