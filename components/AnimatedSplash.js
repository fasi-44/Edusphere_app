import { useEffect } from "react";
import { Image, StyleSheet, View } from "react-native";
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";

// Minimum time the branded splash stays on screen before fading out.
const MIN_DURATION = 2000;

export default function AnimatedSplash({ onFinish }) {
  const containerOpacity = useSharedValue(1);
  const logoOpacity = useSharedValue(0);
  const logoScale = useSharedValue(0.82);
  const taglineOpacity = useSharedValue(0);
  const dot1 = useSharedValue(0.3);
  const dot2 = useSharedValue(0.3);
  const dot3 = useSharedValue(0.3);

  useEffect(() => {
    logoOpacity.value = withTiming(1, {
      duration: 600,
      easing: Easing.out(Easing.cubic),
    });
    logoScale.value = withTiming(1, {
      duration: 700,
      easing: Easing.out(Easing.back(1.3)),
    });
    taglineOpacity.value = withDelay(
      420,
      withTiming(1, { duration: 500, easing: Easing.out(Easing.cubic) })
    );

    const pulse = (delay) =>
      withDelay(
        delay,
        withRepeat(
          withSequence(
            withTiming(1, { duration: 420 }),
            withTiming(0.3, { duration: 420 })
          ),
          -1,
          false
        )
      );
    dot1.value = pulse(0);
    dot2.value = pulse(160);
    dot3.value = pulse(320);

    const timer = setTimeout(() => {
      containerOpacity.value = withTiming(
        0,
        { duration: 450, easing: Easing.in(Easing.cubic) },
        (finished) => {
          if (finished) runOnJS(onFinish)();
        }
      );
    }, MIN_DURATION);

    return () => clearTimeout(timer);
  }, []);

  const containerStyle = useAnimatedStyle(() => ({
    opacity: containerOpacity.value,
  }));
  const logoStyle = useAnimatedStyle(() => ({
    opacity: logoOpacity.value,
    transform: [{ scale: logoScale.value }],
  }));
  const taglineStyle = useAnimatedStyle(() => ({
    opacity: taglineOpacity.value,
  }));
  const dot1Style = useAnimatedStyle(() => ({ opacity: dot1.value }));
  const dot2Style = useAnimatedStyle(() => ({ opacity: dot2.value }));
  const dot3Style = useAnimatedStyle(() => ({ opacity: dot3.value }));

  return (
    <Animated.View
      style={[StyleSheet.absoluteFill, styles.container, containerStyle]}
    >
      <View style={styles.accent} />
      <Animated.View style={logoStyle}>
        <Image
          source={require("../assets/edusphere-logo.png")}
          style={styles.logo}
          resizeMode="contain"
        />
      </Animated.View>
      <Animated.Text style={[styles.tagline, taglineStyle]}>
        School Management, Simplified
      </Animated.Text>
      <View style={styles.dots}>
        <Animated.View style={[styles.dot, dot1Style]} />
        <Animated.View style={[styles.dot, dot2Style]} />
        <Animated.View style={[styles.dot, dot3Style]} />
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#ffffff",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 50,
  },
  accent: {
    position: "absolute",
    width: 340,
    height: 340,
    borderRadius: 170,
    backgroundColor: "#eef2ff",
    top: "26%",
  },
  logo: {
    width: 300,
    height: 62,
  },
  tagline: {
    fontFamily: "Lexend_400Regular",
    fontSize: 15,
    color: "#64748b",
    marginTop: 18,
    letterSpacing: 0.3,
  },
  dots: {
    flexDirection: "row",
    position: "absolute",
    bottom: 84,
    gap: 9,
  },
  dot: {
    width: 9,
    height: 9,
    borderRadius: 5,
    backgroundColor: "#6366f1",
  },
});
