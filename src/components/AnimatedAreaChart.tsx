import React, {useEffect, useRef, useState} from 'react';
import {View, StyleSheet, Animated} from 'react-native';
import Svg, {Path, Polyline} from 'react-native-svg';

interface AnimatedAreaChartProps {
  data: number[];
  color: string;
  width: number;
  height: number;
}

const AnimatedAreaChart: React.FC<AnimatedAreaChartProps> = ({
  data,
  color,
  width,
  height,
}) => {
  const animatedValue = useRef(new Animated.Value(0)).current;
  const [animatedPath, setAnimatedPath] = useState<string>('');
  const [animatedLine, setAnimatedLine] = useState<string>('');
  const [opacity, setOpacity] = useState(0);

  useEffect(() => {
    Animated.timing(animatedValue, {
      toValue: 1,
      duration: 1500,
      useNativeDriver: false,
    }).start();
  }, []);

  const maxValue = Math.max(...data, 1);
  const minValue = Math.min(...data, 0);
  const range = maxValue - minValue || 1;

  useEffect(() => {
    const listener = animatedValue.addListener(({value}) => {
      // Animate points from bottom
      const points = data.map((val, index) => {
        const x = (index / (data.length - 1 || 1)) * width;
        const targetY = height - ((val - minValue) / range) * height;
        const startY = height;
        const y = startY + (targetY - startY) * value;
        return `${x},${y}`;
      });

      const areaPath = [
        `M 0,${height}`,
        ...points.map((point, index) => (index === 0 ? `L ${point}` : `L ${point}`)),
        `L ${width},${height}`,
        'Z',
      ].join(' ');

      setAnimatedPath(areaPath);
      setAnimatedLine(points.join(' '));
      setOpacity(value * 0.3);
    });

    return () => {
      animatedValue.removeListener(listener);
    };
  }, [data, width, height, maxValue, minValue, range, animatedValue]);

  // Final paths for initial render
  const finalPoints = data.map((value, index) => {
    const x = (index / (data.length - 1 || 1)) * width;
    const y = height - ((value - minValue) / range) * height;
    return `${x},${y}`;
  });

  const finalAreaPath = [
    `M 0,${height}`,
    ...finalPoints.map((point, index) => (index === 0 ? `L ${point}` : `L ${point}`)),
    `L ${width},${height}`,
    'Z',
  ].join(' ');

  return (
    <View style={[styles.container, {width, height}]}>
      <Svg width={width} height={height}>
        {/* Animated area fill */}
        <Path
          d={animatedPath || finalAreaPath}
          fill={color}
          opacity={opacity}
        />
        {/* Animated line */}
        <Polyline
          points={animatedLine || finalPoints.join(' ')}
          fill="none"
          stroke={color}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </Svg>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
  },
});

export default AnimatedAreaChart;

