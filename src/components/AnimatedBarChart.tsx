import React from 'react';
import {View, StyleSheet} from 'react-native';

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
  const maxValue = Math.max(...data, 1);
  const barWidth = width / data.length - 4;

  return (
    <View style={[styles.container, {width, height}]}>
      {data.map((value, index) => {
        const barHeight = (value / maxValue) * height;
        return (
          <View
            key={index}
            style={[
              styles.bar,
              {
                width: barWidth,
                height: barHeight,
                backgroundColor: color,
              },
            ]}
          />
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-around',
  },
  bar: {
    borderRadius: 2,
  },
});

export default AnimatedBarChart;
