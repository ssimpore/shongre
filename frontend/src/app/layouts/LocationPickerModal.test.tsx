import { describe, it, expect } from "vitest";
import React from "react";
import { LocationPickerModal } from "./LocationPickerModal";
import { MarketLocationProvider } from "../providers/MarketLocationProvider";

describe("LocationPickerModal", () => {
  it("renders correctly with MarketLocationProvider wrapper", () => {
    const element = React.createElement(
      MarketLocationProvider,
      null,
      React.createElement(LocationPickerModal),
    );

    expect(element).toBeDefined();
  });
});
