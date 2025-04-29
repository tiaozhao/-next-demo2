import type { Ref, SVGProps } from "react";
import { forwardRef, memo } from "react";

// Create the base SVG component
const SvgComponent = (
  props: SVGProps<SVGSVGElement>,
  ref: Ref<SVGSVGElement>,
) => (
  <svg
    {...props}
    width="14"
    height="14"
    viewBox="0 0 14 14"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    ref={ref}
  >
    <path
      d="M8.73112 6.98112L12.6686 3.08008C12.8874 2.86133 12.8874 2.46029 12.6686 2.24154L11.7572 1.33008C11.5384 1.11133 11.1374 1.11133 10.9186 1.33008L7.01758 5.26758L3.08008 1.33008C2.86133 1.11133 2.46029 1.11133 2.24154 1.33008L1.33008 2.24154C1.11133 2.46029 1.11133 2.86133 1.33008 3.08008L5.26758 6.98112L1.33008 10.9186C1.11133 11.1374 1.11133 11.5384 1.33008 11.7572L2.24154 12.6686C2.46029 12.8874 2.86133 12.8874 3.08008 12.6686L7.01758 8.73112L10.9186 12.6686C11.1374 12.8874 11.5384 12.8874 11.7572 12.6686L12.6686 11.7572C12.8874 11.5384 12.8874 11.1374 12.6686 10.9186L8.73112 6.98112Z"
      fill="currentColor" // Changed from #353535 to currentColor for better theme support
    />
  </svg>
);

// Create a forwarded ref component
const ForwardRef = forwardRef(SvgComponent);

// Create the final memoized component
const CloseLight = memo(ForwardRef);

// Export the component
export default CloseLight;
