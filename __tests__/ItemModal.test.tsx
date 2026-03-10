import React from "react";
import ReactTestRenderer from "react-test-renderer";
import { ItemModal } from "../src/components/ItemModal";
import { Place } from "../src/features/inventory";

jest.mock("@react-native-picker/picker", () => {
  const React = require("react");
  const Picker = ({ children, ...props }: any) =>
    React.createElement("Picker", props, children);
  Picker.Item = (props: any) => React.createElement("PickerItem", props);
  return { Picker };
});

jest.mock("../src/localization", () => ({
  useLocalization: () => ({ t: (key: string) => key }),
}));

jest.mock("../src/hooks", () => ({
  useMedia: () => ({
    showMediaPicker: jest.fn(),
    deleteMedia: jest.fn(),
  }),
}));

jest.mock("../src/components/MediaGallery", () => ({
  MediaGallery: () => null,
}));

const createBaseItem = (): Partial<Place> => ({
  id: "item-1",
  placeType: "Place_Area" as const,
  attributes: {
    name: "Test Area",
    notes: "",
    areaHa: 1,
  },
});

test("selects option by label when code is missing", () => {
  const item: Partial<Place> = {
    ...createBaseItem(),
    attributes: {
      ...createBaseItem().attributes,
      ManagementClass: { label: "naturv\u00e5rd med sk\u00f6tsel" },
    },
  };

  let renderer: ReactTestRenderer.ReactTestRenderer;
  ReactTestRenderer.act(() => {
    renderer = ReactTestRenderer.create(
      <ItemModal
        visible
        item={item}
        mode="edit"
        onChangeItem={jest.fn()}
        onSave={jest.fn()}
        onCancel={jest.fn()}
      />
    );
  });

  const pickers = renderer!.root.findAllByType("Picker" as any);
  // Find the ManagementClass picker (not the "Add Attribute" picker)
  const picker = pickers.find(
    (p) =>
      p.props.selectedValue === "NS" ||
      p.props.children?.some((c: any) => c?.props?.value === "NS")
  );
  expect(picker).toBeTruthy();
  expect(picker!.props.selectedValue).toBe("NS");
});

test("selects option by code when label is missing", () => {
  const item: Partial<Place> = {
    ...createBaseItem(),
    attributes: {
      ...createBaseItem().attributes,
      ManagementClass: { code: "NO" },
    },
  };

  let renderer: ReactTestRenderer.ReactTestRenderer;
  ReactTestRenderer.act(() => {
    renderer = ReactTestRenderer.create(
      <ItemModal
        visible
        item={item}
        mode="edit"
        onChangeItem={jest.fn()}
        onSave={jest.fn()}
        onCancel={jest.fn()}
      />
    );
  });

  const pickers = renderer!.root.findAllByType("Picker" as any);
  // Find the ManagementClass picker (not the "Add Attribute" picker)
  const picker = pickers.find(
    (p) =>
      p.props.selectedValue === "NO" ||
      p.props.children?.some((c: any) => c?.props?.value === "NO")
  );
  expect(picker).toBeTruthy();
  expect(picker!.props.selectedValue).toBe("NO");
});
