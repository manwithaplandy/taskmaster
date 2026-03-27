import { render, screen, waitFor, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Navbar from "./Navbar";

vi.mock("next/link", () => ({
  default: ({
    href,
    children,
    ...props
  }: {
    href: string;
    children: React.ReactNode;
  }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

let authStateCallback: (
  event: string,
  session: { user: { id: string; email: string } } | null
) => void;

const mockGetUser = vi.fn();
const mockSignOut = vi.fn();
const mockUnsubscribe = vi.fn();

vi.mock("@/lib/supabase-browser", () => ({
  supabase: {
    auth: {
      getUser: () => mockGetUser(),
      onAuthStateChange: (
        callback: (
          event: string,
          session: { user: { id: string; email: string } } | null
        ) => void
      ) => {
        authStateCallback = callback;
        return {
          data: {
            subscription: {
              unsubscribe: mockUnsubscribe,
            },
          },
        };
      },
      signOut: () => mockSignOut(),
    },
  },
}));

describe("Navbar", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetUser.mockResolvedValue({ data: { user: null } });
    mockSignOut.mockResolvedValue({});
  });

  it("shows 'Taskmaster' brand link pointing to /", async () => {
    await act(async () => {
      render(<Navbar />);
    });

    const brandLink = screen.getByRole("link", { name: "Taskmaster" });
    expect(brandLink).toBeInTheDocument();
    expect(brandLink).toHaveAttribute("href", "/");
  });

  it("shows 'Leaderboard' link", async () => {
    await act(async () => {
      render(<Navbar />);
    });

    const leaderboardLink = screen.getByRole("link", {
      name: "Leaderboard",
    });
    expect(leaderboardLink).toHaveAttribute("href", "/leaderboard");
  });

  it("shows 'Sign In' link when not logged in", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });

    await act(async () => {
      render(<Navbar />);
    });

    await waitFor(() => {
      expect(
        screen.getByRole("link", { name: "Sign In" })
      ).toBeInTheDocument();
    });

    expect(screen.getByRole("link", { name: "Sign In" })).toHaveAttribute(
      "href",
      "/login"
    );
  });

  it("does not show 'History' or 'Sign Out' when not logged in", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });

    await act(async () => {
      render(<Navbar />);
    });

    expect(screen.queryByRole("link", { name: "History" })).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Sign Out" })
    ).not.toBeInTheDocument();
  });

  it("shows 'History' and 'Sign Out' when logged in", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: "user-1", email: "test@example.com" } },
    });

    await act(async () => {
      render(<Navbar />);
    });

    await waitFor(() => {
      expect(
        screen.getByRole("link", { name: "History" })
      ).toBeInTheDocument();
    });

    expect(screen.getByRole("link", { name: "History" })).toHaveAttribute(
      "href",
      "/history"
    );
    expect(
      screen.getByRole("button", { name: "Sign Out" })
    ).toBeInTheDocument();
  });

  it("does not show 'Sign In' link when logged in", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: "user-1", email: "test@example.com" } },
    });

    await act(async () => {
      render(<Navbar />);
    });

    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: "Sign Out" })
      ).toBeInTheDocument();
    });

    expect(
      screen.queryByRole("link", { name: "Sign In" })
    ).not.toBeInTheDocument();
  });

  it("calls supabase.auth.signOut and redirects when Sign Out is clicked", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: "user-1", email: "test@example.com" } },
    });

    const originalLocation = window.location;
    Object.defineProperty(window, "location", {
      value: { ...originalLocation, href: "" },
      writable: true,
    });

    try {
      const user = userEvent.setup();

      await act(async () => {
        render(<Navbar />);
      });

      await waitFor(() => {
        expect(
          screen.getByRole("button", { name: "Sign Out" })
        ).toBeInTheDocument();
      });

      await user.click(screen.getByRole("button", { name: "Sign Out" }));

      expect(mockSignOut).toHaveBeenCalledTimes(1);

      await waitFor(() => {
        expect(window.location.href).toBe("/");
      });
    } finally {
      Object.defineProperty(window, "location", {
        value: originalLocation,
        writable: true,
      });
    }
  });

  it("updates UI when auth state changes to logged in", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });

    await act(async () => {
      render(<Navbar />);
    });

    // Initially not logged in
    expect(
      screen.getByRole("link", { name: "Sign In" })
    ).toBeInTheDocument();

    // Simulate login via auth state change
    await act(async () => {
      authStateCallback("SIGNED_IN", {
        user: { id: "user-1", email: "test@example.com" },
      });
    });

    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: "Sign Out" })
      ).toBeInTheDocument();
    });

    expect(
      screen.queryByRole("link", { name: "Sign In" })
    ).not.toBeInTheDocument();
  });

  it("updates UI when auth state changes to logged out", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: "user-1", email: "test@example.com" } },
    });

    await act(async () => {
      render(<Navbar />);
    });

    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: "Sign Out" })
      ).toBeInTheDocument();
    });

    // Simulate logout via auth state change
    await act(async () => {
      authStateCallback("SIGNED_OUT", null);
    });

    await waitFor(() => {
      expect(
        screen.getByRole("link", { name: "Sign In" })
      ).toBeInTheDocument();
    });
  });

  it("unsubscribes from auth state changes on unmount", async () => {
    let unmount: () => void;

    await act(async () => {
      const result = render(<Navbar />);
      unmount = result.unmount;
    });

    unmount!();

    expect(mockUnsubscribe).toHaveBeenCalledTimes(1);
  });
});
