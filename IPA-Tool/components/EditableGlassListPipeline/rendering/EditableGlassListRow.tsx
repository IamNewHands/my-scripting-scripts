import {
  Group,
  type CommonViewProps,
  type VirtualNode,
} from "scripting";
import type {
  EditableGlassListChildren,
  EditableGlassListRowPropsPatch,
} from "../types";

export type EditableGlassListRowProps = EditableGlassListRowPropsPatch & {
  children?: EditableGlassListChildren;
};

const rowGlass = UIGlass.clear().interactive(true);

export const editableGlassRowStyleProps = {
  padding: true,
  frame: {
    maxHeight: "infinity" as const,
    maxWidth: "infinity" as const,
    alignment: "leading" as const,
  },
  glassEffect: {
    glass: rowGlass,
    shape: {
      type: "rect" as const,
      cornerRadius: 20,
    },
  },
  shadow: {
    color: "rgba(72,88,120,0.16)",
    radius: 12,
    y: 5,
  },
  listRowBackground: <></>,
  listRowSeparator: "hidden" as const,
} satisfies CommonViewProps;

const mergeRowProps = (props: EditableGlassListRowPropsPatch) => ({
  ...editableGlassRowStyleProps,
  ...props,
});

export function EditableGlassListRow(props: EditableGlassListRowProps) {
  return <Group {...mergeRowProps(props)}>{props.children}</Group>;
}

export const withEditableGlassListRowStyle = (
  node: VirtualNode,
  props?: EditableGlassListRowPropsPatch
) => ({
  ...node,
  props: {
    ...mergeRowProps(props ?? {}),
    ...node.props,
  },
});
