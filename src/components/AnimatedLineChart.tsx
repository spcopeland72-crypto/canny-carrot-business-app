import React, {useEffect, useRef, useState} from 'react';
import {View, StyleSheet, Animated} from 'react-native';
import Svg, {Polyline} from 'react-native-svg';

interface AnimatedLineChartProps {
  data: number[];
  color: string;
  width: number;
  height: number;
}

const AnimatedLineChart: React.FC<AnimatedLineChartProps> = ({
  data,
  color,
  width,
  height,
}) => {
  const animatedValue = useRef(new Animated.Value(0)).current;
  const [animatedPoints, setAnimatedPoints] = useState<string>('');

  useEffect(() => {
    Animated.timing(animatedValue, {
      toValue: 1,
      duration: 1500,
      useNativeDriver: false,
    }).start();
  }, []);

  // Normalize data to fit chart dimensions
  const maxValue = Math.max(...data, 1);
  const minValue = Math.min(...data, 0);
  const range = maxValue - minValue || 1;

  useEffect(() => {
    const listener = animatedValue.addListener(({value}) => {
      const points = data.map((val, index) => {
        const x = (index / (data.length - 1 || 1)) * width;
        const baseY = height - ((val - minValue) / range) * height;
        const startY = height;
        const y = startY + (baseY - startY) * value;
        return `${x},${y}`;
      }).join(' ');
      setAnimatedPoints(points);
    });

    return () => {
      animatedValue.removeListener(listener);
    };
  }, [data, width, height, maxValue, minValue, range, animatedValue]);

  const finalPoints = data.map((value, index) => {
    const x = (index / (data.length - 1 || 1)) * width;
    const y = height - ((value - minValue) / range) * height;
    return {x, y};
  });

  return (
    <View style={[styles.container, {width, height}]}>
      <Svg width={width} height={height}>
        <Polyline
          points={animatedPoints || finalPoints.map(p => `${p.x},${p.y}`).join(' ')}
          fill="none"
          stroke={color}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {finalPoints.map((point, index) => {
          const scale = animatedValue.interpolate({
            inputRange: [0, 1],
            outputRange: [0, 1],
          });
          const opacity = animatedValue.interpolate({
            inputRange: [0, 1],
            outputRange: [0, 1],
          });
          return (
            <Animated.View
              key={index}
              style={{
                position: 'absolute',
                left: point.x - 3,
                top: point.y - 3,
                width: 6,
                height: 6,
                borderRadius: 3,
                backgroundColor: color,
                transform: [{scale}],
                opacity: opacity as any,
              }}
            />
          );
        })}
      </Svg>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
  },
});

export default AnimatedLineChart;

