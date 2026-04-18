import { BarChart, Bar, XAxis, YAxis, Tooltip, Cell, ResponsiveContainer } from 'recharts';
import { motion } from 'framer-motion';

const BAR_COLORS = {
  default: '#D1D5DB',
  top: '#52B788',
  high: '#74C69D',
};

const CustomTooltip = ({ active, payload }) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-white/95 backdrop-blur-sm rounded-lg shadow-glass px-3 py-2 border border-forest-100/50">
        <p className="text-sm font-medium text-ink">{data.name}</p>
        <p className="text-xs text-sage font-semibold">{(data.value * 100).toFixed(1)}%</p>
      </div>
    );
  }
  return null;
};

export default function PredictionChart({ predictions = {}, topSpecies = '' }) {
  const data = Object.entries(predictions)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.5 }}
      className="w-full"
    >
      <h3 className="text-sm font-semibold text-ink mb-3">Prediction Breakdown</h3>
      <div className="w-full h-52">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            layout="vertical"
            margin={{ top: 0, right: 20, left: 0, bottom: 0 }}
            barSize={22}
          >
            <XAxis
              type="number"
              domain={[0, 1]}
              tickFormatter={(v) => `${(v * 100).toFixed(0)}%`}
              tick={{ fontSize: 11, fill: '#6B7280' }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              type="category"
              dataKey="name"
              tick={{ fontSize: 12, fill: '#1A1A2E', fontWeight: 500 }}
              axisLine={false}
              tickLine={false}
              width={100}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(82,183,136,0.05)' }} />
            <Bar dataKey="value" radius={[0, 6, 6, 0]}>
              {data.map((entry) => (
                <Cell
                  key={entry.name}
                  fill={
                    entry.name === topSpecies
                      ? BAR_COLORS.top
                      : entry.value > 0.1
                      ? BAR_COLORS.high
                      : BAR_COLORS.default
                  }
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </motion.div>
  );
}
