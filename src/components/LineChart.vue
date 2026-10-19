<template>
  <div class="chart-wrap">
    <svg :viewBox="`0 0 ${width} ${height}`" width="100%" role="img">
      <g v-for="tick in ticks" :key="tick">
        <line :x1="padLeft" :x2="width - padRight" :y1="yOf(tick)" :y2="yOf(tick)" stroke="#eef1f6" stroke-width="1" />
        <text :x="padLeft - 8" :y="yOf(tick) + 4" text-anchor="end" font-size="11" fill="#9aa3af">{{ tick }}%</text>
      </g>

      <g v-for="(label, index) in labels" :key="label">
        <text :x="xOf(index)" :y="height - 8" text-anchor="middle" font-size="11" fill="#9aa3af">{{ label }}</text>
      </g>

      <g v-for="item in series" :key="item.name">
        <polyline
          :points="pointsOf(item.values)"
          fill="none"
          :stroke="item.color"
          stroke-width="2"
          stroke-linejoin="round"
          stroke-linecap="round"
        />
        <circle v-for="(value, index) in item.values" :key="index" :cx="xOf(index)" :cy="yOf(value)" r="3" :fill="item.color" />
      </g>
    </svg>

    <div class="legend">
      <span v-for="item in series" :key="item.name" class="legend-item">
        <span class="swatch" :style="{ background: item.color }" />
        {{ item.name }}
      </span>
    </div>
  </div>
</template>

<script setup>
import { computed } from "vue";

const props = defineProps({
  labels: { type: Array, default: () => [] },
  series: { type: Array, default: () => [] },
  max: { type: Number, default: 100 },
});

const width = 680;
const height = 220;
const padLeft = 40;
const padRight = 16;
const padTop = 16;
const padBottom = 30;

const ticks = computed(() => [0, 25, 50, 75, 100]);

function xOf(index) {
  const count = Math.max(props.labels.length - 1, 1);
  return padLeft + ((width - padLeft - padRight) * index) / count;
}

function yOf(value) {
  const usable = height - padTop - padBottom;
  const ratio = Math.min(Math.max(value / props.max, 0), 1);
  return padTop + usable * (1 - ratio);
}

function pointsOf(values) {
  return values.map((value, index) => `${xOf(index)},${yOf(value)}`).join(" ");
}
</script>

<style scoped>
.chart-wrap {
  padding: 4px 8px 12px;
}

.legend {
  display: flex;
  gap: 20px;
  padding-left: 44px;
  font-size: 12px;
  color: #6b7280;
}

.legend-item {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.swatch {
  width: 8px;
  height: 8px;
  border-radius: 2px;
  display: inline-block;
}
</style>
