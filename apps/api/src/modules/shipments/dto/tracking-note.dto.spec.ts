import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { TRACKING_NOTE_MAX_LENGTH, TrackingNoteDto } from './tracking-note.dto';
import { UpdateShipmentStatusDto } from './update-shipment-status.dto';

const errorsFor = async (cls: new () => object, body: object) =>
  (await validate(plainToInstance(cls, body))).map((e) => e.property);

describe('tracking note validation', () => {
  const longNote = 'x'.repeat(TRACKING_NOTE_MAX_LENGTH + 1);

  it.each([
    TrackingNoteDto,
    UpdateShipmentStatusDto,
  ])('%o rejects a note over the max length', async (cls) => {
    const errors = await errorsFor(cls, {
      status: 'COLLECTED',
      note: longNote,
    });

    expect(errors).toEqual(['note']);
  });

  it('accepts a missing or max-length note', async () => {
    expect(
      await errorsFor(UpdateShipmentStatusDto, { status: 'COLLECTED' }),
    ).toEqual([]);
    expect(
      await errorsFor(TrackingNoteDto, {
        note: 'x'.repeat(TRACKING_NOTE_MAX_LENGTH),
      }),
    ).toEqual([]);
  });
});
