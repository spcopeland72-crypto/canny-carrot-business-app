import React, {useEffect, useRef} from 'react';
import {View, StyleSheet, Animated} from 'react-native';

interface AnimatedBarChartProps {
  data: number[];
  color: string;
  width: number;
  height: number;
}

const AnimatedBarChart: React.FC<AnimatedBarChartProps> = ({
  data,
  color,
  width,
  height,
}) => {
  const animatedValues = useRef(
    data.map(() => new Animated.Value(0))
  ).current;

  useEffect(() => {
    const animations = animatedValues.map((anim, index) =>
      Animated.timing(anim, {
        toValue: 1,
        duration: 800,
        delay: index * 100,
        useNativeDriver: false,
      })
    );
    Animated.stagger(50, animations).start();
  }, []);

  const maxValue = Math.max(...data, 1);
  const barWidth = (width - (data.length - 1) * 4) / data.length;

  return (
    <View style={[styles.container, {width, height}]}>
      {data.map((value, index) => {
        const barHeight = (value / maxValue) * height;
        const x = index * (barWidth + 4);

        return (
          <AnimatedBar
            key={index}
            x={x}
            width={barWidth}
            maxHeight={barHeight}
            color={color}
            animatedValue={animatedValues[index]}
          />
        );
      })}
    </View>
  );
};

const AnimatedBar: React.FC<{
  x: number;
  width: number;
  maxHeight: number;
  color: string;
  animatedValue: Animated.Value;
}> = ({x, width, maxHeight, color, animatedValue}) => {
  const animatedHeight = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [0, maxHeight],
  });

  return (
    <Animated.View
      style={{
        position: 'absolute',
        left: x,
        bottom: 0,
        width,
        height: animatedHeight,
        backgroundColor: color,
        borderRadius: 4,
      }}
    />
  );
};

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
    position: 'relative',
  },
});

export default AnimatedBarChart;

