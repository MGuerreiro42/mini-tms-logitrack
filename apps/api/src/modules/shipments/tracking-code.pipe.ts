import {
  Injectable,
  NotFoundException,
  type PipeTransform,
} from '@nestjs/common';
import { TRACKING_CODE_PATTERN } from './tracking-code';

@Injectable()
export class TrackingCodePipe implements PipeTransform<string, string> {
  transform(value: string): string {
    // 404, not 400: a malformed code is indistinguishable from one that does not exist.
    if (!TRACKING_CODE_PATTERN.test(value)) {
      throw new NotFoundException('Shipment not found');
    }
    return value;
  }
}
