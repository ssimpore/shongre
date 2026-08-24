import { afterEach, describe, expect, it } from "vitest";
import { userRepository } from "./user.repository";
import { storageService } from "../services/storage.service";

afterEach(() => {
  storageService.remove("shongre_users_v1");
});

describe("user repository list projections", () => {
  it("collapses fixture-key and id-key aliases for a saved demo user", async () => {
    const seller = storageService.getUser("seller_camille");
    expect(seller).not.toBeNull();

    storageService.saveUser({
      ...seller!,
      name: "Camille Martin mise à jour",
    });

    const matchingUsers = (await userRepository.getAllUsers()).filter(
      (user) => user.id === seller!.id,
    );

    expect(matchingUsers).toHaveLength(1);
    expect(matchingUsers[0]?.name).toBe("Camille Martin mise à jour");
  });
});
