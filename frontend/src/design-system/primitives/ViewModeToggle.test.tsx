import { describe, it, expect, vi } from "vitest";
import React from "react";
import { ViewModeToggle } from "./ViewModeToggle";

describe("ViewModeToggle Primitive", () => {
  it("instantiates correctly with grid selected", () => {
    const handleChange = vi.fn();
    const element = React.createElement(ViewModeToggle, {
      viewMode: "grid",
      onChange: handleChange,
      showMap: true,
    });

    expect(element).toBeDefined();
    expect(element.type).toBe(ViewModeToggle);
    expect(element.props.viewMode).toBe("grid");
    expect(element.props.showMap).toBe(true);
  });

  it("instantiates correctly with list selected", () => {
    const handleChange = vi.fn();
    const element = React.createElement(ViewModeToggle, {
      viewMode: "list",
      onChange: handleChange,
      showMap: false,
    });

    expect(element).toBeDefined();
    expect(element.props.viewMode).toBe("list");
    expect(element.props.showMap).toBe(false);
  });
});
