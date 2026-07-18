export const initialFormData = {
  username: "",
  password: "",
  captcha: "",
};

export type LoginFormData = typeof initialFormData;

export type SetLoginFormData = (
  value: LoginFormData | ((prev: LoginFormData) => LoginFormData)
) => void;

export type LoginSubmit = (
  username: string,
  password: string,
  captcha: string,
  setCaptchaPagePresented: (state: boolean) => void
) => void;

export const updateForm = (
  setFormData: SetLoginFormData,
  patch: Partial<LoginFormData>
) => setFormData(prev => ({ ...prev, ...patch }));
