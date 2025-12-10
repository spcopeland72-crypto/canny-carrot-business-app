import React, {useEffect, useRef, useState} from 'react';
import {View, StyleSheet, Animated} from 'react-native';
import Svg, {Circle} from 'react-native-svg';

interface AnimatedDonutChartProps {
  percentage: number; // 0-100
  color: string;
  size: number;
  strokeWidth?: number;
}

const AnimatedDonutChart: React.FC<AnimatedDonutChartProps> = ({
  percentage,
  color,
  size,
  strokeWidth = 8,
}) => {
  const animatedValue = useRef(new Animated.Value(0)).current;
  const [currentPercentage, setCurrentPercentage] = useState(0);
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  useEffect(() => {
    Animated.timing(animatedValue, {
      toValue: percentage / 100,
      duration: 1500,
      useNativeDriver: false,
    }).start();
  }, [percentage]);

  useEffect(() => {
    const listener = animatedValue.addListener(({value}) => {
      setCurrentPercentage(value * 100);
    });

    return () => {
      animatedValue.removeListener(listener);
    };
  }, [animatedValue]);

  const strokeDashoffset = circumference * (1 - currentPercentage / 100);

  return (
    <View style={[styles.container, {width: size, height: size}]}>
      <Svg width={size} height={size}>
        {/* Background circle */}
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="#E5E7EB"
          strokeWidth={strokeWidth}
          fill="transparent"
        />
        {/* Animated progress circle */}
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={color}
          strokeWidth={strokeWidth}
          fill="transparent"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default AnimatedDonutChart;

