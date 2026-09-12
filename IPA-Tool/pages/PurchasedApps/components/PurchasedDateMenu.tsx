import {
  Button,
  Divider,
  Menu,
  useEffect,
  useMemo,
  useRef,
  useState,
  VStack,
} from "scripting";
import { AnimText } from "../../../components/AnimText";
import { purchasedDateMenuAction } from "../model/purchasedDateMenuAction";
import type { PurchasedDateOption } from "../model/purchasedDateOptions";

/** 显示当前月份，并只在可视月份变化时更新自身。 */
export default function PurchasedDateMenu({
  options,
}: {
  options: PurchasedDateOption[];
}) {
  const optionsRef = useRef(options);
  optionsRef.current = options;

  const [selectedKey, setSelectedKey] = useState(options[0]?.key ?? "");
  const selectedKeyRef = useRef(selectedKey);
  selectedKeyRef.current = selectedKey;

  const value = options.some(option => option.key === selectedKey)
    ? selectedKey
    : (options[0]?.key ?? "");
  const selectedOption = options.find(option => option.key === value);

  useEffect(() => {
    if (selectedKey === value) return;
    selectedKeyRef.current = value;
    setSelectedKey(value);
  }, [selectedKey, value]);

  useEffect(() => {
    const handleVisibleIndex = (index: number) => {
      if (!Number.isInteger(index) || index < 0) return;

      let nextOption: PurchasedDateOption | undefined;
      for (const option of optionsRef.current) {
        if (option.index > index) break;
        nextOption = option;
      }

      if (!nextOption || nextOption.key === selectedKeyRef.current) return;
      selectedKeyRef.current = nextOption.key;
      setSelectedKey(nextOption.key);
    };

    purchasedDateMenuAction.add(handleVisibleIndex);
    return () => purchasedDateMenuAction.remove(handleVisibleIndex);
  }, []);

  const menuItems = useMemo(
    () =>
      options.flatMap((option, index) => [
        <Button
          key={option.key}
          title={option.label}
          systemImage={option.key === value ? "checkmark" : undefined}
          action={() => {
            setTimeout(() => {
              purchasedDateMenuAction.scrollTo(option.index);
            }, 0);
          }}
        />,
        index < options.length - 1 ? (
          <Divider key={`${option.key}-divider`} />
        ) : null,
      ]),
    [options, value]
  );

  const glass = useMemo(
    () =>
      ({
        glass: UIGlass.regular().interactive(),
        shape: "buttonBorder",
      }) as const,
    []
  );

  return (
    <Menu
      label={
        <VStack padding={14} glassEffect={glass}>
          <AnimText
            font="footnote"
            fontWeight="medium"
            foregroundStyle="label"
          >
            {selectedOption?.label ? `${selectedOption.label} ⌄` : "(￣▽￣)"}
          </AnimText>
        </VStack>
      }
    >
      {menuItems}
    </Menu>
  );
}
