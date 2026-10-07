import { Ruler } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import { getMeasurementFields, getMeasurementLabel } from '@/utils/measurementUtils';
import { showSuccess, showError } from '@/lib/toastHelpers';

interface MeasurementsFormProps {
  measurements: Record<string, string>;
  onChange: (measurements: Record<string, string>) => void;
  productCategory?: string;
  productName?: string;
  isAuthenticated: boolean;
  saveMeasurements?: (payload: {
    label: string;
    chest?: number;
    waist?: number;
    hips?: number;
    shoulders?: number;
    sleeveLength?: number;
    shirtLength?: number;
    neck?: number;
    inseam?: number;
    thigh?: number;
  }) => Promise<{ success: boolean; message?: string }>;
  variant?: '2d' | '3d';
}

const FIELD_TO_API: Record<string, string> = { shoulder: 'shoulders' };

const MEASUREMENT_RANGES: Record<string, { min: number; max: number; defaultValue: number }> = {
  neck: { min: 12, max: 24, defaultValue: 15.5 },
  chest: { min: 30, max: 65, defaultValue: 40 },
  waist: { min: 26, max: 60, defaultValue: 34 },
  hips: { min: 30, max: 65, defaultValue: 40 },
  shoulder: { min: 14, max: 26, defaultValue: 18 },
  sleeveLength: { min: 20, max: 40, defaultValue: 34 },
  shirtLength: { min: 25, max: 38, defaultValue: 30 },
  bicep: { min: 10, max: 25, defaultValue: 15 },
  wrist: { min: 6, max: 14, defaultValue: 7.5 },
  thigh: { min: 18, max: 35, defaultValue: 24 },
  knee: { min: 12, max: 25, defaultValue: 16 },
  legOpening: { min: 10, max: 20, defaultValue: 14 },
  rise: { min: 8, max: 16, defaultValue: 11 },
  inseam: { min: 25, max: 40, defaultValue: 32 },
  outseam: { min: 35, max: 50, defaultValue: 41 },
  jacketLength: { min: 25, max: 38, defaultValue: 30 },
  seat: { min: 30, max: 60, defaultValue: 40 },
  lapelWidth: { min: 2, max: 5, defaultValue: 3.5 },
};

const getRange = (field: string) => MEASUREMENT_RANGES[field] || { min: 5, max: 60, defaultValue: 20 };

function parseMeasurementsForSave(m: Record<string, string>): Record<string, number | undefined> {
  const result: Record<string, number | undefined> = {};
  Object.entries(m).forEach(([key, val]) => {
    if (!val || !String(val).trim()) return;
    const apiKey = FIELD_TO_API[key] ?? key;
    result[apiKey] = parseFloat(val);
  });
  return result;
}

export function MeasurementsForm({
  measurements,
  onChange,
  productCategory,
  productName,
  isAuthenticated,
  saveMeasurements,
  variant = '2d',
}: MeasurementsFormProps): JSX.Element {
  const fields = getMeasurementFields(productCategory);
  const is3D = variant === '3d';

  const handleFieldChange = (field: string, value: string) => {
    if (is3D && value !== '' && !/^\d*\.?\d*$/.test(value)) return;
    onChange({ ...measurements, [field]: value });
  };

  const handleSaveToProfile = async (): Promise<void> => {
    if (!saveMeasurements) return;
    const m = measurements || {};
    const parsed = parseMeasurementsForSave(m);
    const label = productName
      ? `${productName} - ${new Date().toLocaleDateString()}`
      : `Custom ${productCategory || 'item'} - ${new Date().toLocaleDateString()}`;
    const result = await saveMeasurements({
      label,
      ...parsed,
    });
    if (result.success) {
      showSuccess('Measurements saved to your profile!');
    } else {
      showError(result.message ?? 'Failed to save measurements');
    }
  };

  const hasAnyMeasurement = Object.keys(measurements || {}).some((k) => measurements?.[k]);

  return (
    <div className="space-y-4 animate-in fade-in duration-300" style={{ animationDelay: '100ms' }}>
      <div className="p-3 rounded-xl bg-accent/5 border border-accent/10">
        <p className="text-xs text-foreground/80">
          <strong>Tip:</strong> All measurements should be in inches. For best results, have someone help you measure.
        </p>
      </div>

      <div className="grid gap-3 lg:gap-4 grid-cols-1 sm:grid-cols-2">
        {fields.map((field) => {
          const range = getRange(field);
          const currentVal = measurements[field] ? parseFloat(measurements[field]) : range.defaultValue;
          const displayVal = isNaN(currentVal) ? range.defaultValue : currentVal;

          return (
            <div key={field} className="space-y-3 bg-white p-3 lg:p-4 rounded-xl border border-border/50 shadow-sm hover:border-primary/20 transition-all group">
              <div className="flex justify-between items-center mb-1">
                <label className="text-sm font-semibold text-foreground capitalize flex items-center gap-1.5">
                  {getMeasurementLabel(field)}
                  <span className="text-red-500">*</span>
                </label>
                <div className="px-3 py-1 rounded-full bg-primary/5 text-primary text-sm font-semibold border border-primary/10">
                  {displayVal.toFixed(1)}"
                </div>
              </div>

              <div className="px-1 pt-2">
                <Slider
                  value={[displayVal]}
                  min={range.min}
                  max={range.max}
                  step={0.5}
                  onValueChange={(vals) => handleFieldChange(field, vals[0].toString())}
                  className="py-1 cursor-ew-resize"
                />
                <div className="flex justify-between text-[10px] text-muted-foreground font-medium mt-1">
                  <span>{range.min}"</span>
                  <span>{range.max}"</span>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      <div className="bg-blue-50/80 p-4 rounded-xl border border-blue-100/50 mt-6">
        <div className="flex gap-3">
          <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center shrink-0">
            <Ruler className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-sm font-semibold text-blue-900">Measurement Guide</h4>
            <p className="text-xs text-blue-700/80 mt-1 leading-relaxed">
              Use the sliders or type exact values directly. All measurements are in inches.
              Visit our <Link to="#" className="underline font-medium hover:text-blue-900 transition-colors">Size Guide</Link> for detailed instructions.
            </p>
          </div>
        </div>
      </div>

      {isAuthenticated && hasAnyMeasurement && saveMeasurements && (
        <button
          onClick={handleSaveToProfile}
          className={`w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-xs font-medium bg-primary/10 text-primary hover:bg-primary/20 transition-all ${is3D ? 'mt-4 border border-primary/20 py-3 text-sm' : ''}`}
        >
          <Ruler className="w-4 h-4" />
          Save Measurements to Profile
        </button>
      )}
    </div>
  );
}
