import { Button } from "scripting";
import type { AppSearchSuccess } from "../../../types/appStore";
import { useAppVersionSelection } from "../store/useAppVersionSelection";
import { useStartAppDownload } from "../../../hooks";
import DownloadIcon from "./DownloadIcon";

interface DownloadButtonProps {
  app: AppSearchSuccess;
}

const DownloadButton = ({
  app: { id, name, icon },
}: DownloadButtonProps) => {
  const { startAppDownload } = useStartAppDownload();
  const [selectedVersion] = useAppVersionSelection();
  const { internalVersion } = selectedVersion[id] ?? {};
  const startDownload = () => {
    HapticFeedback.mediumImpact();
    startAppDownload({
      id,
      name,
      internalVersion,
      icon,
    });
  };

  return (
    <Button action={startDownload} buttonStyle="borderless">
     <DownloadIcon id={id} />
    </Button>
  );
};

export default DownloadButton;
