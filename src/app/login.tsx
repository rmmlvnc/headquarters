import { router } from "expo-router";
import { useRef, useState } from "react";
import { signIn, authError } from "../lib/auth-api";
import {
    Alert,
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

type LoginErrors = {
  email?: string;
  password?: string;
};

export default function LoginScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [errors, setErrors] = useState<LoginErrors>({});
  const [loading, setLoading] = useState(false);
  const [serverMessage, setServerMessage] = useState("");
  const submitting = useRef(false);

  const isValidEmail = (value: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
  };

  const handleLogin = async () => {
    if (submitting.current) return;
    setServerMessage("");
    const newErrors: LoginErrors = {};

    if (!email.trim()) {
      newErrors.email = "Email address is required.";
    } else if (!isValidEmail(email.trim())) {
      newErrors.email = "Enter a valid email address.";
    }

    if (!password) {
      newErrors.password = "Password is required.";
    } else if (password.length < 8) {
      newErrors.password = "Password must contain at least 8 characters.";
    }

    setErrors(newErrors);

    if (Object.keys(newErrors).length > 0) {
      return;
    }

    submitting.current = true;
    setLoading(true);
    try {
      await signIn(email, password);
      // The auth listener and protected navigator open the member screen.
    } catch (error) {
      setServerMessage(authError(error));
    } finally {
      submitting.current = false;
      setLoading(false);
    }
  };
  const handleForgotPassword = () => {
    Alert.alert(
      "Forgot password",
      "Password reset is not enabled in this app yet. Contact HeadQuarters staff for account recovery.",
    );
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

          <Text style={styles.title}>Welcome back</Text>

          <Text style={styles.subtitle}>
            Log in securely to your HeadQuarters account.
          </Text>

          <View style={styles.form}>
            {!!serverMessage && <Text accessibilityLiveRegion="polite" style={styles.errorText}>{serverMessage}</Text>}
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
                  placeholder="Enter your password"
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
              ) : null}
            </View>

            <Pressable
              style={styles.forgotButton}
              onPress={handleForgotPassword}
            >
              <Text style={styles.forgotButtonText}>Forgot password?</Text>
            </Pressable>

            <Pressable
              style={({ pressed }) => [
                styles.loginButton,
                pressed && styles.buttonPressed,
                loading && styles.disabledButton,
              ]}
              onPress={handleLogin}
              disabled={loading}
            >
              <Text style={styles.loginButtonText}>
                {loading ? "Logging in..." : "Log in"}
              </Text>
            </Pressable>

            <View style={styles.registerRow}>
              <Text style={styles.registerQuestion}>
                Don&apos;t have an account?
              </Text>

              <Pressable onPress={() => router.push("/register")}>
                <Text style={styles.registerLink}> Create account</Text>
              </Pressable>
            </View>
          </View>

          <View style={styles.demoNotice}>
            <Text style={styles.demoNoticeTitle}>UI demonstration</Text>
            <Text style={styles.demoNoticeText}>
              You may enter any valid email and an 8-character password while
              the database is not yet connected.
            </Text>
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
    paddingBottom: 35,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 28,
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
    fontSize: 31,
    fontWeight: "800",
  },
  subtitle: {
    color: "#777386",
    fontSize: 15,
    lineHeight: 22,
    marginTop: 8,
  },
  form: {
    marginTop: 34,
  },
  inputGroup: {
    marginBottom: 18,
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
  forgotButton: {
    alignSelf: "flex-end",
    marginTop: -2,
    marginBottom: 26,
  },
  forgotButtonText: {
    color: "#5B3FD6",
    fontSize: 14,
    fontWeight: "700",
  },
  loginButton: {
    minHeight: 56,
    borderRadius: 16,
    backgroundColor: "#5B3FD6",
    alignItems: "center",
    justifyContent: "center",
  },
  loginButtonText: {
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
  registerRow: {
    flexDirection: "row",
    justifyContent: "center",
    flexWrap: "wrap",
    marginTop: 24,
  },
  registerQuestion: {
    color: "#777386",
    fontSize: 14,
  },
  registerLink: {
    color: "#5B3FD6",
    fontSize: 14,
    fontWeight: "700",
  },
  demoNotice: {
    borderRadius: 15,
    backgroundColor: "#EEEAFE",
    padding: 16,
    marginTop: 32,
  },
  demoNoticeTitle: {
    color: "#3D278F",
    fontSize: 13,
    fontWeight: "800",
  },
  demoNoticeText: {
    color: "#665F7A",
    fontSize: 12,
    lineHeight: 18,
    marginTop: 4,
  },
});


