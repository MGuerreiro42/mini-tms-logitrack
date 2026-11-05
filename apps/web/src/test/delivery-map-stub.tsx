import type { DeliveryMapProps } from '@/features/tracking/components/delivery-map';

// Stands in for the lazy map so screen tests can read what the callers pass it.
export function LazyDeliveryMap(props: DeliveryMapProps) {
  return (
    <div data-testid="delivery-map" data-props={JSON.stringify(props)}>
      {props.caption}
    </div>
  );
}

export function mapProps(element: HTMLElement): DeliveryMapProps {
  return JSON.parse(element.dataset.props ?? '{}');
}
