import {
  ContentUnavailableView,
  LazyVStack,
  ScrollView,
  HStack,
  Section,
  ScrollViewReader,
  useEffect,
  useRef,
  type CommonViewProps,
  type FunctionComponent,
  type ScrollViewProxy,
  type ScrollViewProps,
} from "scripting";
import { AnimTextGlassBadge } from "../../../components/GlassBadge";
import type { Store } from "../../../constants/Platform";
import type { AppSearchSuccess } from "../../../types/appStore";
import { purchasedDateMenuAction } from "../model/purchasedDateMenuAction";
import type { PurchasedAppItem, PurchasedAppRegistryRef } from "../model/types";
import PurchasedAppCard from "./PurchasedAppCard";

type PurchasedScrollViewProps = ScrollViewProps & CommonViewProps;
const PurchasedScrollView =
  ScrollView as unknown as FunctionComponent<PurchasedScrollViewProps>;

const purchasedCardKey = (version: number, index: number) =>
  `${version}:${index}`;

const purchasedCardIndex = (id: string | number) => {
  const parts = String(id).split(":");
  return Number(parts[parts.length - 1]);
};

function PurchasedAppsSectionHeader({ count }: { count: number }) {
  return (
    <HStack
      spacing={8}
      padding={{ bottom: 8, horizontal: true }}
      alignment="firstTextBaseline"
      frame={{ maxWidth: "infinity", alignment: "leading" }}
    >
      <AnimTextGlassBadge font={12}>共{count}项</AnimTextGlassBadge>
    </HStack>
  );
}

type PurchasedAppsListProps = {
  items: PurchasedAppItem[];
  store: Store;
  registryRef: PurchasedAppRegistryRef;
  query: string;
  isSearchPresented: boolean;
  onQueryChange: (query: string) => void;
  onSearchSubmit: () => void;
  onSearchPresentedChange: (presented: boolean) => void;
  onVisibilityChange: (ids: string[] | number[]) => void;
  onOpenHistory: (app: AppSearchSuccess) => void;
  onRefresh: () => Promise<void>;
};

/** 渲染已购应用列表，并把系统可视索引交给列表 Hook 处理。 */
export default function PurchasedAppsList({
  items,
  store,
  registryRef,
  query,
  isSearchPresented,
  onQueryChange,
  onSearchSubmit,
  onSearchPresentedChange,
  onVisibilityChange,
  onOpenHistory,
  onRefresh,
}: PurchasedAppsListProps) {
  const countRef = useRef(items.length);
  const proxyRef = useRef<ScrollViewProxy | null>(null);
  const itemsVersionRef = useRef({ items, value: 0 });
  countRef.current = items.length;
  if (itemsVersionRef.current.items !== items) {
    itemsVersionRef.current = {
      items,
      value: itemsVersionRef.current.value + 1,
    };
  }

  useEffect(() => {
    const scrollTo = (index: number) => {
      proxyRef.current?.scrollTo(
        purchasedCardKey(itemsVersionRef.current.value, index),
        "top",
      );
    };

    purchasedDateMenuAction.addScroll(scrollTo);
    return () => purchasedDateMenuAction.removeScroll(scrollTo);
  }, []);

  return (
    <ScrollViewReader>
      {proxy => {
        proxyRef.current = proxy;
        return (
          <PurchasedScrollView
            searchable={{
              value: query,
              onChanged: onQueryChange,
              presented: {
                value: isSearchPresented,
                onChanged: onSearchPresentedChange,
              },
              placement: "navigationBarDrawer",
              prompt: "搜索名称、App ID 或 Bundle ID",
            }}
            submitLabel="search"
            onSubmit={{
              triggers: "search",
              action: onSearchSubmit,
            }}
            onScrollTargetVisibilityChange={{
              idType: "string",
              threshold: 0.5,
              onChanged: ids => {
                const indexes = ids
                  .map(purchasedCardIndex)
                  .filter(index => Number.isInteger(index) && index >= 0);
                setTimeout(() => {
                  onVisibilityChange(indexes);
                }, 0);

                const index = indexes[0];
                if (index !== undefined) {
                  purchasedDateMenuAction.publish(index);
                }
              },
            }}
            refreshable={onRefresh}
          >
            <Section
              header={<PurchasedAppsSectionHeader count={countRef.current} />}
            >
              <LazyVStack
                scrollTargetLayout
                spacing={20}
                padding={{ horizontal: 15, vertical: 4 }}
              >
                {items.length ? (
                  items.map((item, index) => (
                    <PurchasedAppCard
                      key={purchasedCardKey(
                        itemsVersionRef.current.value,
                        index,
                      )}
                      appId={item.id}
                      name={item.name}
                      version={item.version}
                      purchaseDate={item.purchaseDate}
                      index={index}
                      store={store}
                      registryRef={registryRef}
                      onOpenHistory={onOpenHistory}
                    />
                  ))
                ) : query.trim() ? (
                  <ContentUnavailableView
                    title="未找到已购 App"
                    systemImage="magnifyingglass"
                    description="尝试搜索名称、App ID、Bundle ID 或版本"
                  />
                ) : null}
              </LazyVStack>
            </Section>
          </PurchasedScrollView>
        );
      }}
    </ScrollViewReader>
  );
}
