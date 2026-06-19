import React, { useState } from "react";
import { motion } from "framer-motion";
import { Eye, EyeOff, Loader2, Lock, Mail, User, Users } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useAuthCardTilt } from "../hooks/useAuthCardTilt";
import { toUserFacingErrorMessage } from "../../../utils/errorMessages";
import InfoTooltip from "../../../components/InfoTooltip";
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
    filter: "none",
    transition: { duration: 0.35, ease: "easeOut" },
  },
};

const M = motion;

function RegisterForm() {
  const navigate = useNavigate();
  const { signup, isAuthenticating } = useAuth();
  const { cardMotionStyle, handlePointerMove, handlePointerLeave } = useAuthCardTilt();
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    password: "",
    householdInviteCode: "",
  });
  const [errors, setErrors] = useState({});
  const [authError, setAuthError] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    setAuthError("");
    setErrors((prev) => {
      const next = { ...prev };
      delete next[name];
      return next;
    });
  };

  const handlePasswordBlur = (e) => {
    const value = e.target.value;
    setErrors((prev) => {
      const next = { ...prev };
      if (value.length > 0 && value.length < 6) {
        next.password = "Password must be at least 6 characters";
      } else {
        delete next.password;
      }
      return next;
    });
  };

  const validate = () => {
    const newErrors = {};
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!formData.fullName.trim()) {
      newErrors.fullName = "Full name is required";
    }
    if (!formData.email || !emailRegex.test(formData.email)) {
      newErrors.email = "Valid email is required";
    }

    const password = formData.password || "";
    if (password.length < 6) {
      newErrors.password = "Password must be at least 6 characters";
    }

    if (formData.householdInviteCode && formData.householdInviteCode.trim().length > 0) {
      const code = formData.householdInviteCode.trim().toUpperCase();
      if (!/^[A-HJ-NP-Z2-9]{6}$/.test(code)) {
        newErrors.householdInviteCode =
          "Invite code must be 6 characters (letters and numbers). Check the code from your household admin.";
      }
    }

    return newErrors;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isAuthenticating) return;

    const validationErrors = validate();
    setErrors(validationErrors);

    if (Object.keys(validationErrors).length === 0) {
      try {
        await signup(formData);
        navigate("/home");
      } catch (error) {
        setAuthError(toUserFacingErrorMessage(error, "Could not create your account. Please try again."));
      }
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
          <h1 className="auth-title page-title">Create <span>account</span></h1>
          <p className="auth-subtitle">Build greener household habits together</p>

          <M.form
            className="auth-form"
            onSubmit={handleSubmit}
            variants={formVariants}
            initial="hidden"
            animate="show"
          >
            <M.div className="auth-field" variants={fieldVariants}>
              <label className="auth-label" htmlFor="fullName">
                Full name
              </label>
              <div className={`auth-input-wrap ${errors.fullName ? "has-error" : ""}`}>
                <User size={18} className="auth-icon" />
                <input
                  type="text"
                  id="fullName"
                  name="fullName"
                  value={formData.fullName}
                  onChange={handleChange}
                  className="auth-input"
                  placeholder="John Green"
                />
              </div>
              {errors.fullName && <p className="auth-error">{errors.fullName}</p>}
            </M.div>

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
                  onBlur={handlePasswordBlur}
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

            <M.div className="auth-field" variants={fieldVariants}>
              <label className="auth-label" htmlFor="householdInviteCode">
                Household invite code (optional)
              </label>
              <div className={`auth-input-wrap invite ${errors.householdInviteCode ? "has-error" : ""}`}>
                <Users size={18} className="auth-icon" />
                <input
                  type="text"
                  id="householdInviteCode"
                  name="householdInviteCode"
                  value={formData.householdInviteCode}
                  onChange={handleChange}
                  className="auth-input"
                  placeholder="6-character code (e.g. K7P2QM)"
                  maxLength={6}
                  autoCapitalize="characters"
                  autoCorrect="off"
                  spellCheck={false}
                  style={{ textTransform: "uppercase" }}
                  inputMode="text"
                  aria-describedby={
                    errors.householdInviteCode ? "invite-code-error" : undefined
                  }
                />
                <InfoTooltip
                  label="What is a household invite code?"
                  text="Ask your household admin for this code. You can also join a household from Settings after registration."
                />
              </div>
              {errors.householdInviteCode && (
                <p id="invite-code-error" className="auth-error">{errors.householdInviteCode}</p>
              )}
            </M.div>

            {authError && <p className="auth-alert">{authError}</p>}

            <M.button
              className="auth-submit"
              type="submit"
              disabled={isAuthenticating}
              variants={fieldVariants}
            >
              {isAuthenticating ? <Loader2 size={16} className="spin" /> : null}
              {isAuthenticating ? "Creating Account..." : "Register"}
            </M.button>

            <M.div className="auth-separator" aria-hidden="true" variants={fieldVariants}>
              <span className="auth-separator-line" />
              <span className="auth-separator-text">OR</span>
              <span className="auth-separator-line" />
            </M.div>
          </M.form>

          <p className="auth-link-row">
            <span className="auth-link-prefix">Already have an account?</span>{" "}
            <a
              href="#signin"
              className="auth-link"
              onClick={(e) => {
                e.preventDefault();
                navigate("/signin");
              }}
            >
              Sign in
            </a>
          </p>
        </div>
      </M.article>
    </section>
  );
}

export default RegisterForm;
