import React from 'react';
import {View, StyleSheet, Text} from 'react-native';

interface AnimatedDonutChartProps {
  percentage: number;
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
  return (
    <View style={[styles.container, {width: size, height: size}]}>
      <View
        style={[
          styles.circle,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            borderWidth: strokeWidth,
            borderColor: color,
            opacity: 0.3,
          },
        ]}
      />
      <View style={styles.textContainer}>
        <Text style={[styles.percentage, {color}]}>{Math.round(percentage)}%</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  circle: {
    position: 'absolute',
  },
  textContainer: {
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center',
  },
  percentage: {
    fontSize: 10,
    fontWeight: 'bold',
  },
});

export default AnimatedDonutChart;
