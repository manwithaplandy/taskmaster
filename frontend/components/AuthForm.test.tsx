import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import AuthForm from "./AuthForm";

const mockPush = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}));

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

const mockSignUp = vi.fn();
const mockSignInWithPassword = vi.fn();

vi.mock("@/lib/supabase-browser", () => ({
  supabase: {
    auth: {
      signUp: (...args: unknown[]) => mockSignUp(...args),
      signInWithPassword: (...args: unknown[]) =>
        mockSignInWithPassword(...args),
    },
  },
}));

const getEmailInput = () => screen.getByPlaceholderText("you@example.com");
const getPasswordInput = () => screen.getByPlaceholderText("••••••••");
const getUsernameInput = () =>
  screen.getByPlaceholderText("TaskmasterFan42");

describe("AuthForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSignUp.mockResolvedValue({ error: null });
    mockSignInWithPassword.mockResolvedValue({ error: null });
  });

  describe("login mode", () => {
    it("shows email and password fields", () => {
      render(<AuthForm mode="login" />);

      expect(getEmailInput()).toBeInTheDocument();
      expect(getPasswordInput()).toBeInTheDocument();
    });

    it("does not show username field", () => {
      render(<AuthForm mode="login" />);

      expect(screen.queryByText("Username")).not.toBeInTheDocument();
      expect(
        screen.queryByPlaceholderText("TaskmasterFan42")
      ).not.toBeInTheDocument();
    });

    it("shows 'Sign In' button", () => {
      render(<AuthForm mode="login" />);

      expect(
        screen.getByRole("button", { name: "Sign In" })
      ).toBeInTheDocument();
    });

    it("shows link to signup page", () => {
      render(<AuthForm mode="login" />);

      const signUpLink = screen.getByRole("link", { name: "Sign up" });
      expect(signUpLink).toBeInTheDocument();
      expect(signUpLink).toHaveAttribute("href", "/signup");
    });

    it("shows 'Welcome Back' heading", () => {
      render(<AuthForm mode="login" />);
      expect(screen.getByText("Welcome Back")).toBeInTheDocument();
    });

    it("calls signInWithPassword on submit", async () => {
      const user = userEvent.setup();
      render(<AuthForm mode="login" />);

      await user.type(getEmailInput(), "test@example.com");
      await user.type(getPasswordInput(), "password123");
      await user.click(screen.getByRole("button", { name: "Sign In" }));

      await waitFor(() => {
        expect(mockSignInWithPassword).toHaveBeenCalledWith({
          email: "test@example.com",
          password: "password123",
        });
      });
    });

    it("navigates to / on successful login", async () => {
      const user = userEvent.setup();
      render(<AuthForm mode="login" />);

      await user.type(getEmailInput(), "test@example.com");
      await user.type(getPasswordInput(), "password123");
      await user.click(screen.getByRole("button", { name: "Sign In" }));

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith("/");
      });
    });
  });

  describe("signup mode", () => {
    it("shows username, email, and password fields", () => {
      render(<AuthForm mode="signup" />);

      expect(getUsernameInput()).toBeInTheDocument();
      expect(getEmailInput()).toBeInTheDocument();
      expect(getPasswordInput()).toBeInTheDocument();
    });

    it("shows 'Create Account' button", () => {
      render(<AuthForm mode="signup" />);

      expect(
        screen.getByRole("button", { name: "Create Account" })
      ).toBeInTheDocument();
    });

    it("shows link to login page", () => {
      render(<AuthForm mode="signup" />);

      const signInLink = screen.getByRole("link", { name: "Sign in" });
      expect(signInLink).toBeInTheDocument();
      expect(signInLink).toHaveAttribute("href", "/login");
    });

    it("shows 'Join Taskmaster' heading", () => {
      render(<AuthForm mode="signup" />);
      expect(screen.getByText("Join Taskmaster")).toBeInTheDocument();
    });

    it("calls signUp with username in metadata on submit", async () => {
      const user = userEvent.setup();
      render(<AuthForm mode="signup" />);

      await user.type(getUsernameInput(), "testuser");
      await user.type(getEmailInput(), "test@example.com");
      await user.type(getPasswordInput(), "password123");
      await user.click(
        screen.getByRole("button", { name: "Create Account" })
      );

      await waitFor(() => {
        expect(mockSignUp).toHaveBeenCalledWith({
          email: "test@example.com",
          password: "password123",
          options: { data: { username: "testuser" } },
        });
      });
    });

    it("navigates to / on successful signup", async () => {
      const user = userEvent.setup();
      render(<AuthForm mode="signup" />);

      await user.type(getUsernameInput(), "testuser");
      await user.type(getEmailInput(), "test@example.com");
      await user.type(getPasswordInput(), "password123");
      await user.click(
        screen.getByRole("button", { name: "Create Account" })
      );

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith("/");
      });
    });
  });

  describe("error handling", () => {
    it("shows error message on login failure", async () => {
      mockSignInWithPassword.mockResolvedValue({
        error: new Error("Invalid credentials"),
      });

      const user = userEvent.setup();
      render(<AuthForm mode="login" />);

      await user.type(getEmailInput(), "test@example.com");
      await user.type(getPasswordInput(), "wrong");
      await user.click(screen.getByRole("button", { name: "Sign In" }));

      await waitFor(() => {
        expect(screen.getByText("Invalid credentials")).toBeInTheDocument();
      });
    });

    it("shows error message on signup failure", async () => {
      mockSignUp.mockResolvedValue({
        error: new Error("Email already in use"),
      });

      const user = userEvent.setup();
      render(<AuthForm mode="signup" />);

      await user.type(getUsernameInput(), "testuser");
      await user.type(getEmailInput(), "test@example.com");
      await user.type(getPasswordInput(), "password123");
      await user.click(
        screen.getByRole("button", { name: "Create Account" })
      );

      await waitFor(() => {
        expect(screen.getByText("Email already in use")).toBeInTheDocument();
      });
    });

    it("shows generic error for non-Error exceptions", async () => {
      mockSignInWithPassword.mockImplementation(() => {
        throw "unexpected";
      });

      const user = userEvent.setup();
      render(<AuthForm mode="login" />);

      await user.type(getEmailInput(), "test@example.com");
      await user.type(getPasswordInput(), "password123");
      await user.click(screen.getByRole("button", { name: "Sign In" }));

      await waitFor(() => {
        expect(screen.getByText("Something went wrong")).toBeInTheDocument();
      });
    });
  });

  describe("loading state", () => {
    it("shows 'Loading...' during login submission", async () => {
      let resolveLogin!: (value: { error: null }) => void;
      mockSignInWithPassword.mockImplementation(
        () =>
          new Promise((resolve) => {
            resolveLogin = resolve;
          })
      );

      const user = userEvent.setup();
      render(<AuthForm mode="login" />);

      await user.type(getEmailInput(), "test@example.com");
      await user.type(getPasswordInput(), "password123");
      await user.click(screen.getByRole("button", { name: "Sign In" }));

      expect(screen.getByText("Loading...")).toBeInTheDocument();
      expect(screen.getByRole("button")).toBeDisabled();

      resolveLogin({ error: null });

      await waitFor(() => {
        expect(screen.queryByText("Loading...")).not.toBeInTheDocument();
      });
    });

    it("disables submit button during loading", async () => {
      let resolveSignUp!: (value: { error: null }) => void;
      mockSignUp.mockImplementation(
        () =>
          new Promise((resolve) => {
            resolveSignUp = resolve;
          })
      );

      const user = userEvent.setup();
      render(<AuthForm mode="signup" />);

      await user.type(getUsernameInput(), "testuser");
      await user.type(getEmailInput(), "test@example.com");
      await user.type(getPasswordInput(), "password123");
      await user.click(
        screen.getByRole("button", { name: "Create Account" })
      );

      expect(screen.getByRole("button")).toBeDisabled();

      resolveSignUp({ error: null });

      await waitFor(() => {
        expect(screen.getByRole("button")).not.toBeDisabled();
      });
    });
  });
});
