import { createAuthUser, createProfile, signInWithPassword, signOutWithSession, Role } from "../src/repositories/auth-repo";
import { supabase } from "../src/supabase";
import { describe, it, expect, mock } from "bun:test";

describe("createAuthUser", () => {
  it("should throw error when signup fails", async () => {
    const mockSignUp = mock(() => ({
      data: { user: null },
      error: new Error("signup failed"),
    }));

    (global as any).supabase = {
      auth: { signUp: mockSignUp },
    };

    await expect(createAuthUser("a@a.com", "1234", "A", "B")).rejects.toThrow("signup failed");
  });
});

mock.module("../src/supabase", () => ({
  supabase: {
    auth: {
      signUp: mock(() => ({
        data: { user: { id: "mock-user-id" } },
        error: null,
      })),
      admin: {
        deleteUser: mock(() => ({})),
        signOut: mock(() => ({})),
      },
      signInWithPassword: mock(() => ({
        data: { user: { id: "mock-user-id" }, session: { token: "123" } },
        error: null,
      })),
    },
    from: mock(() => ({
      insert: mock(() => ({ error: null })),
      select: mock(() => ({ data: [{ first_name: "A", last_name: "B" }], error: null })),
    })),
  },
}));


describe("Auth Test", () => {
  it("should create user successfully", async () => {
    const result = await createAuthUser("a@a.com", "1234", "A", "B");
    expect(result).toBe("mock-user-id");
  });

  it("should sign in successfully", async () => {
    const result = await signInWithPassword("a@a.com", "1234");
    expect(result.success).toBe(true);
  });
});
