import { router } from "expo-router";
import { useRef, useState } from "react";
import { registerMember, authError } from "../lib/auth-api";
import {
    Image,
    KeyboardAvoidingView,
    Platform,
    Pressable,
    SafeAreaView,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TextInput,
    View,
} from "react-native";

type RegistrationErrors = {
  fullName?: string;
  mobileNumber?: string;
  email?: string;
  password?: string;
  confirmPassword?: string;
  terms?: string;
};

export default function RegisterScreen() {
  const [fullName, setFullName] = useState("");
  const [mobileNumber, setMobileNumber] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [passwordVisible, setPasswordVisible] = useState(false);
  const [confirmPasswordVisible, setConfirmPasswordVisible] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [loading, setLoading] = useState(false);
  const [serverMessage, setServerMessage] = useState("");
  const submitting = useRef(false);
  const [errors, setErrors] = useState<RegistrationErrors>({});

  const isValidEmail = (value: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
  };

  const handleRegister = async () => {
    if (submitting.current) return;
    setServerMessage("");
    const newErrors: RegistrationErrors = {};

    if (!fullName.trim()) {
      newErrors.fullName = "Full name is required.";
    } else if (fullName.trim().length < 3) {
      newErrors.fullName = "Enter your complete name.";
    }

    if (!mobileNumber.trim()) {
      newErrors.mobileNumber = "Mobile number is required.";
    } else if (!/^09\d{9}$/.test(mobileNumber.trim())) {
      newErrors.mobileNumber = "Enter an 11-digit Philippine mobile number.";
    }

    if (!email.trim()) {
      newErrors.email = "Email address is required.";
    } else if (!isValidEmail(email.trim())) {
      newErrors.email = "Enter a valid email address.";
    }

    if (!password) {
      newErrors.password = "Password is required.";
    } else if (password.length < 8 || !/\d/.test(password)) {
      newErrors.password = "Use at least 8 characters and include one number.";
    }

    if (!confirmPassword) {
      newErrors.confirmPassword = "Please enter your password again.";
    } else if (password !== confirmPassword) {
      newErrors.confirmPassword = "Passwords do not match.";
    }

    if (!acceptedTerms) {
      newErrors.terms = "You must accept the terms and privacy policy.";
    }

    setErrors(newErrors);

    if (Object.keys(newErrors).length > 0) {
      return;
    }

    submitting.current = true;
    setLoading(true);
    try {
      const data = await registerMember({ email, password, fullName, mobileNumber });
      if (!data.session) {
        setServerMessage('Check your inbox to confirm your email, then return here to log in. If you already have an account, use Log in.');
        setPassword(''); setConfirmPassword('');
      }
    } catch (error) {
      setServerMessage(authError(error));
    } finally {
      submitting.current = false;
      setLoading(false);
    }
  };
  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#F7F6FB" />

      <KeyboardAvoidingView
        style={styles.keyboardContainer}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Pressable style={styles.backButton} onPress={() => router.back()}>
            <Text style={styles.backButtonText}>‹</Text>
          </Pressable>

          <View style={styles.logoContainer}>
            <Image
              source={require("../../assets/images/hq-logo.jpg")}
              style={styles.logoImage}
              resizeMode="cover"
            />
          </View>

          <Text style={styles.title}>Create your account</Text>

          <Text style={styles.subtitle}>
            Join HeadQuarters and reserve your ideal workspace.
          </Text>

          <View style={styles.form}>
            {!!serverMessage && <Text accessibilityLiveRegion="polite" style={styles.errorText}>{serverMessage}</Text>}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Full name</Text>

              <TextInput
                style={[styles.input, errors.fullName && styles.inputWithError]}
                value={fullName}
                onChangeText={(value) => {
                  setFullName(value);
                  setErrors((previous) => ({
                    ...previous,
                    fullName: undefined,
                  }));
                }}
                placeholder="Enter your complete name"
                placeholderTextColor="#AAA6B4"
                autoCapitalize="words"
              />

              {errors.fullName ? (
                <Text style={styles.errorText}>{errors.fullName}</Text>
              ) : null}
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Mobile number</Text>

              <TextInput
                style={[
                  styles.input,
                  errors.mobileNumber && styles.inputWithError,
                ]}
                value={mobileNumber}
                onChangeText={(value) => {
                  const numbersOnly = value.replace(/[^0-9]/g, "");

                  setMobileNumber(numbersOnly);
                  setErrors((previous) => ({
                    ...previous,
                    mobileNumber: undefined,
                  }));
                }}
                placeholder="09XXXXXXXXX"
                placeholderTextColor="#AAA6B4"
                keyboardType="phone-pad"
                maxLength={11}
              />

              {errors.mobileNumber ? (
                <Text style={styles.errorText}>{errors.mobileNumber}</Text>
              ) : null}
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Email address</Text>

              <TextInput
                style={[styles.input, errors.email && styles.inputWithError]}
                value={email}
                onChangeText={(value) => {
                  setEmail(value);
                  setErrors((previous) => ({
                    ...previous,
                    email: undefined,
                  }));
                }}
                placeholder="example@email.com"
                placeholderTextColor="#AAA6B4"
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
              />

              {errors.email ? (
                <Text style={styles.errorText}>{errors.email}</Text>
              ) : null}
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Password</Text>

              <View
                style={[
                  styles.passwordContainer,
                  errors.password && styles.inputWithError,
                ]}
              >
                <TextInput
                  style={styles.passwordInput}
                  value={password}
                  onChangeText={(value) => {
                    setPassword(value);
                    setErrors((previous) => ({
                      ...previous,
                      password: undefined,
                    }));
                  }}
                  placeholder="Create a password"
                  placeholderTextColor="#AAA6B4"
                  secureTextEntry={!passwordVisible}
                  autoCapitalize="none"
                />

                <Pressable
                  style={styles.showButton}
                  onPress={() => setPasswordVisible(!passwordVisible)}
                >
                  <Text style={styles.showButtonText}>
                    {passwordVisible ? "Hide" : "Show"}
                  </Text>
                </Pressable>
              </View>

              {errors.password ? (
                <Text style={styles.errorText}>{errors.password}</Text>
              ) : (
                <Text style={styles.passwordHint}>
                  Use at least 8 characters and include one number.
                </Text>
              )}
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Confirm password</Text>

              <View
                style={[
                  styles.passwordContainer,
                  errors.confirmPassword && styles.inputWithError,
                ]}
              >
                <TextInput
                  style={styles.passwordInput}
                  value={confirmPassword}
                  onChangeText={(value) => {
                    setConfirmPassword(value);
                    setErrors((previous) => ({
                      ...previous,
                      confirmPassword: undefined,
                    }));
                  }}
                  placeholder="Enter your password again"
                  placeholderTextColor="#AAA6B4"
                  secureTextEntry={!confirmPasswordVisible}
                  autoCapitalize="none"
                />

                <Pressable
                  style={styles.showButton}
                  onPress={() =>
                    setConfirmPasswordVisible(!confirmPasswordVisible)
                  }
                >
                  <Text style={styles.showButtonText}>
                    {confirmPasswordVisible ? "Hide" : "Show"}
                  </Text>
                </Pressable>
              </View>

              {errors.confirmPassword ? (
                <Text style={styles.errorText}>{errors.confirmPassword}</Text>
              ) : null}
            </View>

            <Pressable
              style={styles.termsRow}
              onPress={() => {
                setAcceptedTerms(!acceptedTerms);
                setErrors((previous) => ({
                  ...previous,
                  terms: undefined,
                }));
              }}
            >
              <View
                style={[
                  styles.checkbox,
                  acceptedTerms && styles.checkboxSelected,
                ]}
              >
                {acceptedTerms ? <Text style={styles.checkmark}>✓</Text> : null}
              </View>

              <Text style={styles.termsText}>
                I agree to the{" "}
                <Text style={styles.termsLink}>Terms and Conditions</Text> and{" "}
                <Text style={styles.termsLink}>Privacy Policy</Text>.
              </Text>
            </Pressable>

            {errors.terms ? (
              <Text style={styles.termsError}>{errors.terms}</Text>
            ) : null}

            <Pressable
              style={({ pressed }) => [
                styles.createButton,
                pressed && styles.buttonPressed,
                loading && styles.disabledButton,
              ]}
              onPress={handleRegister}
              disabled={loading}
            >
              <Text style={styles.createButtonText}>
                {loading ? "Creating account..." : "Create account"}
              </Text>
            </Pressable>

            <View style={styles.loginRow}>
              <Text style={styles.loginQuestion}>Already have an account?</Text>

              <Pressable onPress={() => router.replace("/login")}>
                <Text style={styles.loginLink}> Log in</Text>
              </Pressable>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#F7F6FB",
  },
  keyboardContainer: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 40,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 27,
    elevation: 2,
  },
  backButtonText: {
    color: "#1E1B2E",
    fontSize: 38,
    lineHeight: 40,
    marginTop: -5,
  },
  logoContainer: {
    width: 68,
    height: 68,
    borderRadius: 20,
    backgroundColor: "#FFFFFF",
    padding: 3,
    overflow: "hidden",
    marginBottom: 24,
    elevation: 3,
  },
  logoImage: {
    width: "100%",
    height: "100%",
    borderRadius: 17,
  },
  title: {
    color: "#1E1B2E",
    fontSize: 30,
    fontWeight: "800",
  },
  subtitle: {
    color: "#777386",
    fontSize: 15,
    lineHeight: 22,
    marginTop: 8,
  },
  form: {
    marginTop: 32,
  },
  inputGroup: {
    marginBottom: 17,
  },
  label: {
    color: "#1E1B2E",
    fontSize: 14,
    fontWeight: "700",
    marginBottom: 8,
  },
  input: {
    minHeight: 55,
    borderWidth: 1,
    borderColor: "#DEDCE7",
    borderRadius: 15,
    backgroundColor: "#FFFFFF",
    color: "#1E1B2E",
    fontSize: 15,
    paddingHorizontal: 16,
  },
  passwordContainer: {
    minHeight: 55,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#DEDCE7",
    borderRadius: 15,
    backgroundColor: "#FFFFFF",
  },
  passwordInput: {
    flex: 1,
    minHeight: 53,
    color: "#1E1B2E",
    fontSize: 15,
    paddingHorizontal: 16,
  },
  showButton: {
    height: 53,
    justifyContent: "center",
    paddingHorizontal: 16,
  },
  showButtonText: {
    color: "#5B3FD6",
    fontSize: 13,
    fontWeight: "700",
  },
  inputWithError: {
    borderColor: "#C62828",
  },
  errorText: {
    color: "#C62828",
    fontSize: 12,
    marginTop: 6,
  },
  passwordHint: {
    color: "#777386",
    fontSize: 12,
    marginTop: 6,
  },
  termsRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginTop: 2,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderWidth: 1.5,
    borderColor: "#C9C6D2",
    borderRadius: 6,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
    marginTop: 1,
  },
  checkboxSelected: {
    borderColor: "#5B3FD6",
    backgroundColor: "#5B3FD6",
  },
  checkmark: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "900",
  },
  termsText: {
    flex: 1,
    color: "#777386",
    fontSize: 13,
    lineHeight: 19,
  },
  termsLink: {
    color: "#5B3FD6",
    fontWeight: "700",
  },
  termsError: {
    color: "#C62828",
    fontSize: 12,
    marginTop: 6,
    marginBottom: 4,
  },
  createButton: {
    minHeight: 56,
    borderRadius: 16,
    backgroundColor: "#5B3FD6",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 24,
  },
  createButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "800",
  },
  buttonPressed: {
    opacity: 0.8,
  },
  disabledButton: {
    opacity: 0.65,
  },
  loginRow: {
    flexDirection: "row",
    justifyContent: "center",
    flexWrap: "wrap",
    marginTop: 24,
  },
  loginQuestion: {
    color: "#777386",
    fontSize: 14,
  },
  loginLink: {
    color: "#5B3FD6",
    fontSize: 14,
    fontWeight: "700",
  },
});



