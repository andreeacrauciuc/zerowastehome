import React, { useState } from "react";
import { sendPasswordResetEmail } from "firebase/auth";
import { motion } from "framer-motion";
import { Eye, EyeOff, Loader2, Lock, Mail } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useAuthCardTilt } from "../hooks/useAuthCardTilt";
import { auth } from "../../../services/firebase";
import { toUserFacingErrorMessage } from "../../../utils/errorMessages";
import "../../../styles/features/auth/Auth.scss";

const formVariants = {
  hidden: { opacity: 0, y: 10 },
  show: {
    opacity: 1,
    y: 0,
    transition: {
      delayChildren: 0.12,
      staggerChildren: 0.08,
    },
  },
};

const fieldVariants = {
  hidden: { opacity: 0, y: 16, filter: "blur(4px)" },
  show: {
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
    transition: { duration: 0.35, ease: "easeOut" },
  },
};

const M = motion;

function SignInForm() {
  const navigate = useNavigate();
  const { login, isAuthenticating } = useAuth();
  const { cardMotionStyle, handlePointerMove, handlePointerLeave } = useAuthCardTilt();
  const [formData, setFormData] = useState(() => {
    const rememberedEmail = localStorage.getItem("mw-remember-email") || "";
    return { email: rememberedEmail, password: "" };
  });
  const [errors, setErrors] = useState({});
  const [authError, setAuthError] = useState("");
  const [resetSuccess, setResetSuccess] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isResettingPassword, setIsResettingPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(() => {
    return Boolean(localStorage.getItem("mw-remember-email"));
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setAuthError("");
    setResetSuccess("");
    setErrors((prev) => {
      const next = { ...prev };
      delete next[name];
      return next;
    });
  };

  const validate = () => {
    const newErrors = {};
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!formData.email || !emailRegex.test(formData.email)) {
      newErrors.email = "Valid email is required.";
    }
    if (formData.password.length < 6) {
      newErrors.password = "Password must be at least 6 characters.";
    }

    return newErrors;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isAuthenticating || isResettingPassword) return;

    const validationErrors = validate();
    setErrors(validationErrors);
    setResetSuccess("");

    if (Object.keys(validationErrors).length === 0) {
      try {
        await login(formData);

        if (rememberMe) {
          localStorage.setItem("mw-remember-email", formData.email.trim());
        } else {
          localStorage.removeItem("mw-remember-email");
        }

        navigate("/home");
      } catch (error) {
        setAuthError(toUserFacingErrorMessage(error, "Could not sign you in. Please try again."));
      }
    }
  };

  const handlePasswordReset = async (e) => {
    e.preventDefault();
    if (isResettingPassword) return;

    const email = formData.email.trim();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!email || !emailRegex.test(email)) {
      setErrors((prev) => ({ ...prev, email: "Enter your email to reset your password." }));
      setAuthError("");
      return;
    }

    try {
      setIsResettingPassword(true);
      setErrors((prev) => {
        const next = { ...prev };
        delete next.email;
        return next;
      });
      await sendPasswordResetEmail(auth, email);
      setAuthError("");
      setResetSuccess("If an account exists for that email, a password reset link is on its way.");
    } catch (error) {
      setResetSuccess("");

      if (error?.code === "auth/invalid-email") {
        setAuthError("");
        setErrors((prev) => ({ ...prev, email: "The email address is not valid." }));
        return;
      }

      setAuthError("Unable to send reset email right now. Please try again.");
    } finally {
      setIsResettingPassword(false);
    }
  };

  return (
    <section className="auth-shell">
      <div className="auth-grid-overlay" />
      <div className="auth-noise-overlay" />

      <M.article
        className="auth-card"
        style={cardMotionStyle}
        onPointerMove={handlePointerMove}
        onPointerLeave={handlePointerLeave}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
      >
        <div className="auth-light-beams" aria-hidden="true">
          <span className="beam-top" />
          <span className="beam-right" />
          <span className="beam-bottom" />
          <span className="beam-left" />
        </div>

        <div className="auth-card-inner">
          <h1 className="auth-title page-title">Welcome <span>back!</span></h1>
          <p className="auth-subtitle">Sign in to continue reducing waste</p>

          <M.form
            className="auth-form"
            onSubmit={handleSubmit}
            variants={formVariants}
            initial="hidden"
            animate="show"
          >
            <M.div className="auth-field" variants={fieldVariants}>
              <label className="auth-label" htmlFor="email">
                Email
              </label>
              <div className={`auth-input-wrap ${errors.email ? "has-error" : ""}`}>
                <Mail size={18} className="auth-icon" />
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  className="auth-input"
                  placeholder="you@example.com"
                />
              </div>
              {errors.email && <p className="auth-error">{errors.email}</p>}
            </M.div>

            <M.div className="auth-field" variants={fieldVariants}>
              <label className="auth-label" htmlFor="password">
                Password
              </label>
              <div className={`auth-input-wrap ${errors.password ? "has-error" : ""}`}>
                <Lock size={18} className="auth-icon" />
                <input
                  type={showPassword ? "text" : "password"}
                  id="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  className="auth-input"
                  placeholder="Enter your password"
                />
                <button
                  type="button"
                  className="auth-action-icon"
                  onClick={() => setShowPassword((value) => !value)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              {errors.password && <p className="auth-error">{errors.password}</p>}
            </M.div>

            <M.div className="auth-remember-row" variants={fieldVariants}>
              <label className="auth-checkbox-wrap" htmlFor="remember-me">
                <input
                  id="remember-me"
                  type="checkbox"
                  className="auth-checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                />
                <span className="auth-checkbox-text">Remember me</span>
              </label>

              <button
                type="button"
                className="auth-forgot"
                onClick={handlePasswordReset}
                disabled={isResettingPassword}
              >
                {isResettingPassword ? "Sending..." : "Forgot password?"}
              </button>
            </M.div>

            {authError && <p className="auth-alert">{authError}</p>}
            {resetSuccess && <p className="auth-alert success">{resetSuccess}</p>}

            <M.button
              className="auth-submit"
              type="submit"
              disabled={isAuthenticating || isResettingPassword}
              variants={fieldVariants}
            >
              {isAuthenticating ? <Loader2 size={16} className="spin" /> : null}
              {isAuthenticating ? "Signing in..." : "Sign in"}
            </M.button>

            <M.div className="auth-separator" aria-hidden="true" variants={fieldVariants}>
              <span className="auth-separator-line" />
              <span className="auth-separator-text">OR</span>
              <span className="auth-separator-line" />
            </M.div>
          </M.form>

          <p className="auth-link-row">
            <span className="auth-link-prefix">New here?</span>{" "}
            <a
              href="#register"
              className="auth-link"
              onClick={(e) => {
                e.preventDefault();
                navigate("/register");
              }}
            >
              Create account
            </a>
          </p>
        </div>
      </M.article>
    </section>
  );
}

export default SignInForm;
