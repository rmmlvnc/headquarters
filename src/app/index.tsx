import { router } from "expo-router";
import {
  Image,
  ImageBackground,
  Pressable,
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from "react-native";

const logo = require("../../assets/images/hq-logo.jpg");
const background = require("../../assets/images/hq-background.png");

export default function WelcomeScreen() {
  return (
    <ImageBackground
      source={background}
      style={styles.background}
      resizeMode="cover"
    >
      <StatusBar barStyle="light-content" backgroundColor="#211647" />

      <View style={styles.overlay} />

      <SafeAreaView style={styles.container}>
        <View style={styles.content}>
          <View style={styles.logoContainer}>
            <Image source={logo} style={styles.logo} resizeMode="cover" />
          </View>

          <Text style={styles.brandName}>HeadQuarters</Text>
          <Text style={styles.brandLocation}>ILIGAN COWORKING</Text>

          <View style={styles.messageContainer}>
            <Text style={styles.title}>
              Your space to work, meet, and create.
            </Text>

            <Text style={styles.description}>
              Reserve desks and meeting rooms, manage your membership, and
              access your workspace from one application.
            </Text>
          </View>
        </View>

        <View style={styles.buttonContainer}>
          <Pressable
            style={({ pressed }) => [
              styles.loginButton,
              pressed && styles.buttonPressed,
            ]}
            onPress={() => router.push("/login")}
          >
            <Text style={styles.loginButtonText}>Log in</Text>
          </Pressable>

          <Pressable
            style={({ pressed }) => [
              styles.registerButton,
              pressed && styles.buttonPressed,
            ]}
            onPress={() => router.push("/register")}
          >
            <Text style={styles.registerButtonText}>Create an account</Text>
          </Pressable>

          <Text style={styles.footer}>Your workspace. Your community.</Text>
        </View>
      </SafeAreaView>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  background: {
    flex: 1,
    backgroundColor: "#211647",
  },
  overlay: {
    position: "absolute", top: 0, right: 0, bottom: 0, left: 0,
    backgroundColor: "rgba(25, 14, 63, 0.78)",
  },
  container: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 25,
  },
  content: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  logoContainer: {
    width: 105,
    height: 105,
    borderRadius: 29,
    backgroundColor: "#FFFFFF",
    padding: 4,
    overflow: "hidden",
    marginBottom: 20,
    elevation: 8,
    shadowColor: "#000000",
    shadowOffset: {
      width: 0,
      height: 5,
    },
    shadowOpacity: 0.25,
    shadowRadius: 10,
  },
  logo: {
    width: "100%",
    height: "100%",
    borderRadius: 25,
  },
  brandName: {
    color: "#FFFFFF",
    fontSize: 31,
    fontWeight: "800",
  },
  brandLocation: {
    color: "#D8CFFF",
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 2.5,
    marginTop: 5,
  },
  messageContainer: {
    alignItems: "center",
    marginTop: 55,
  },
  title: {
    color: "#FFFFFF",
    fontSize: 27,
    lineHeight: 35,
    fontWeight: "800",
    textAlign: "center",
    maxWidth: 340,
  },
  description: {
    color: "#E7E2F7",
    fontSize: 15,
    lineHeight: 23,
    textAlign: "center",
    marginTop: 15,
    maxWidth: 345,
  },
  buttonContainer: {
    gap: 12,
  },
  loginButton: {
    minHeight: 56,
    borderRadius: 17,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },
  loginButtonText: {
    color: "#3D278F",
    fontSize: 16,
    fontWeight: "800",
  },
  registerButton: {
    minHeight: 56,
    borderWidth: 1.5,
    borderColor: "#D8CFFF",
    borderRadius: 17,
    backgroundColor: "rgba(255,255,255,0.08)",
    alignItems: "center",
    justifyContent: "center",
  },
  registerButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },
  buttonPressed: {
    opacity: 0.75,
  },
  footer: {
    color: "#D8CFFF",
    fontSize: 12,
    textAlign: "center",
    marginTop: 8,
  },
});


