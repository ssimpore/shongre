import { PlatformRole } from '../types';
import { ALL_PERMISSIONS, PermissionDefinition } from './permissions';
import { ROLE_DEFINITIONS } from './roles.config';

export interface MatrixRow {
  permission: PermissionDefinition;
  roleGrants: Record<PlatformRole, boolean>;
}

export interface MatrixCategoryGroup {
  category: PermissionDefinition['category'];
  rows: MatrixRow[];
}

export function getRolePermissionMatrix(): MatrixCategoryGroup[] {
  const roles = Object.keys(ROLE_DEFINITIONS) as PlatformRole[];

  const categoryMap = new Map<PermissionDefinition['category'], MatrixRow[]>();

  for (const perm of ALL_PERMISSIONS) {
    const roleGrants: Record<PlatformRole, boolean> = {} as any;

    for (const role of roles) {
      const def = ROLE_DEFINITIONS[role];
      roleGrants[role] = def.defaultPermissions.includes(perm.id);
    }

    const row: MatrixRow = {
      permission: perm,
      roleGrants,
    };

    if (!categoryMap.has(perm.category)) {
      categoryMap.set(perm.category, []);
    }
    categoryMap.get(perm.category)!.push(row);
  }

  const groups: MatrixCategoryGroup[] = [];
  categoryMap.forEach((rows, category) => {
    groups.push({ category, rows });
  });

  return groups;
}

export function getRoleStats() {
  const roles = Object.keys(ROLE_DEFINITIONS) as PlatformRole[];
  return roles.map((r) => {
    const def = ROLE_DEFINITIONS[r];
    return {
      role: r,
      title: def.title,
      shortLabel: def.shortLabel,
      badgeColor: def.badgeColor,
      hierarchyLevel: def.hierarchyLevel,
      permissionsCount: def.defaultPermissions.length,
      percentageOfAll: Math.round((def.defaultPermissions.length / ALL_PERMISSIONS.length) * 100),
      isInternalStaff: def.isInternalStaff,
    };
  });
}
