import React from 'react';
import {View, StyleSheet} from 'react-native';
import {Colors} from '../constants/Colors';

interface CircularProgressProps {
  size: number;
  strokeWidth: number;
  progress: number; // 0-100
  color?: string;
  backgroundColor?: string;
}

const CircularProgress: React.FC<CircularProgressProps> = ({
  size,
  strokeWidth,
  progress,
  color = Colors.primary,
  backgroundColor = Colors.neutral[200],
}) => {
  return (
    <View style={[styles.container, {width: size, height: size}]}>
      {/* Base circle - gray background only */}
      <View
        style={[
          styles.baseCircle,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            borderWidth: strokeWidth,
            borderColor: backgroundColor,
          },
        ]}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  baseCircle: {
    position: 'absolute',
  },
});

export default CircularProgress;



