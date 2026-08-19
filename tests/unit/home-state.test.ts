import { AppError, HydradbError } from "@/lib/api/errors";
import { homeFailureState } from "@/lib/api/home-state";

describe("home page failure states", () => {
  it("routes an absent graph to the seed instruction state", () => {
    expect(homeFailureState(new AppError("GRAPH_NOT_SEEDED", "not seeded"))).toBe("unseeded");
  });

  it("keeps database and unexpected failures separate", () => {
    expect(homeFailureState(new HydradbError("HYDRADB_UNAVAILABLE", "offline"))).toBe("hydradb");
    expect(homeFailureState(new Error("unknown"))).toBe("error");
  });
});
