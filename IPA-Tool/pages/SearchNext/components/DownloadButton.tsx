import { Button } from "scripting";
import type { AppSearchSuccess } from "../../../types/appStore";
import { useAppVersionSelection } from "../store/useAppVersionSelection";
import { useStartAppDownload } from "../../../hooks";
import { store } from "../hooks/useSearchApps";
import DownloadIcon from "./DownloadIcon";

interface DownloadButtonProps {
  app: AppSearchSuccess;
}

const DownloadButton = ({ app }: DownloadButtonProps) => {
  const { id, name, icon, externalVersionId } = app;
  const { startAppDownload } = useStartAppDownload();
  const [selectedVersion] = useAppVersionSelection();
  const selected = selectedVersion[id]?.[store.platform];
  const internalVersion = selected?.internalVersion ?? externalVersionId;

  const startDownload = () => {
    HapticFeedback.mediumImpact();
    startAppDownload({
      id,
      name,
      internalVersion,
      store,
    });
  };

  return (
    <Button action={startDownload} buttonStyle="borderless">
     <DownloadIcon id={id} />
    </Button>
  );
};

export default DownloadButton;
