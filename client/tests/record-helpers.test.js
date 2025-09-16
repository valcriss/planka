import {
  isUserAdminOrProjectOwner,
  canUserCreateProject,
  isListArchiveOrTrash,
  isListFinite,
} from '../src/utils/record-helpers';
import { UserRoles, ListTypes } from '../src/constants/Enums';

describe('record helpers', () => {
  test('isUserAdminOrProjectOwner', () => {
    expect(isUserAdminOrProjectOwner({ role: UserRoles.ADMIN })).toBe(true);
    expect(isUserAdminOrProjectOwner({ role: UserRoles.PERSONAL_PROJECT_OWNER })).toBe(false);
    expect(isUserAdminOrProjectOwner({ role: UserRoles.BOARD_USER })).toBe(false);
  });

  test('canUserCreateProject', () => {
    expect(canUserCreateProject({ role: UserRoles.ADMIN })).toBe(true);
    expect(canUserCreateProject({ role: UserRoles.PROJECT_OWNER })).toBe(true);
    expect(canUserCreateProject({ role: UserRoles.PERSONAL_PROJECT_OWNER })).toBe(true);
    expect(canUserCreateProject({ role: UserRoles.BOARD_USER })).toBe(false);
  });

  test('isListArchiveOrTrash', () => {
    expect(isListArchiveOrTrash({ type: ListTypes.ARCHIVE })).toBe(true);
    expect(isListArchiveOrTrash({ type: ListTypes.ACTIVE })).toBe(false);
  });

  test('isListFinite', () => {
    expect(isListFinite({ type: ListTypes.ACTIVE })).toBe(true);
    expect(isListFinite({ type: ListTypes.ARCHIVE })).toBe(false);
  });
});
