import { Button, Navigation } from "scripting";

export default function CloseButton() {
  return (
    <Button title="" systemImage="xmark" action={Navigation.useDismiss()} />
  );
}
