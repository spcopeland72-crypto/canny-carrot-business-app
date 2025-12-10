import React from 'react';
import {View, StyleSheet} from 'react-native';

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
  const maxValue = Math.max(...data, 1);
  const barWidth = width / data.length - 2;

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
                opacity: 0.6,
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
    borderRadius: 1,
  },
});

export default AnimatedAreaChart;
