import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import {
  CreateCateringGalleryImageDto,
  CreateCateringPackageDto,
  CreateCateringTestimonialDto,
  UpdateCateringGalleryImageDto,
  UpdateCateringPackageDto,
  UpdateCateringTestimonialDto,
} from './dto/catering-content.dto';
import {
  toGalleryAdmin,
  toGalleryPublic,
  toPackageAdmin,
  toPackagePublic,
  toTestimonialAdmin,
  toTestimonialPublic,
} from './catering.mappers';
import {
  CateringGalleryImagePublic,
  CateringPackageAdmin,
  CateringPackagePublic,
  CateringTestimonialPublic,
} from './catering.types';

const SORT = [{ sortOrder: 'asc' as const }, { createdAt: 'asc' as const }];

/** Turns Prisma "record not found" into a 404. */
async function orNotFound<T>(p: Promise<T>, what: string): Promise<T> {
  try {
    return await p;
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2025') {
      throw new NotFoundException(`${what} not found.`);
    }
    throw e;
  }
}

/** undefined leaves a field alone; null or blank clears it. */
const trimOrNull = (v: string | null | undefined) =>
  v === undefined ? undefined : v?.trim() || null;

function assertGuestRange(min: number, max: number | null | undefined) {
  if (max != null && max < min) {
    throw new BadRequestException('maxGuests must be at least minGuests.');
  }
}

/** Packages, gallery and testimonials. Small owner-curated tables. */
@Injectable()
export class CateringContentService {
  constructor(private readonly prisma: PrismaService) {}

  // ─── Packages ───────────────────────────────────────────────────────────────

  async listPackagesPublic(): Promise<CateringPackagePublic[]> {
    const rows = await this.prisma.cateringPackage.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      take: 100,
    });
    return rows.map(toPackagePublic);
  }

  async listPackagesAdmin(): Promise<CateringPackageAdmin[]> {
    const rows = await this.prisma.cateringPackage.findMany({
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      take: 200,
    });
    return rows.map(toPackageAdmin);
  }

  async createPackage(dto: CreateCateringPackageDto): Promise<CateringPackageAdmin> {
    assertGuestRange(dto.minGuests, dto.maxGuests);
    const row = await this.prisma.cateringPackage.create({
      data: {
        name: dto.name.trim(),
        tagline: trimOrNull(dto.tagline) ?? null,
        description: dto.description.trim(),
        includes: dto.includes.map((s) => s.trim()).filter(Boolean),
        imageUrl: trimOrNull(dto.imageUrl) ?? null,
        minGuests: dto.minGuests,
        maxGuests: dto.maxGuests ?? null,
        price: dto.price != null ? new Prisma.Decimal(dto.price) : null,
        priceUnit: dto.priceUnit ?? 'PER_SET',
        isActive: dto.isActive ?? true,
        sortOrder: dto.sortOrder ?? 0,
      },
    });
    return toPackageAdmin(row);
  }

  async updatePackage(
    id: string,
    dto: UpdateCateringPackageDto,
  ): Promise<CateringPackageAdmin> {
    const current = await this.prisma.cateringPackage.findUnique({ where: { id } });
    if (!current) throw new NotFoundException('Package not found.');
    assertGuestRange(
      dto.minGuests ?? current.minGuests,
      dto.maxGuests !== undefined ? dto.maxGuests : current.maxGuests,
    );
    const row = await orNotFound(
      this.prisma.cateringPackage.update({
        where: { id },
        data: {
          name: dto.name?.trim(),
          tagline: trimOrNull(dto.tagline),
          description: dto.description?.trim(),
          includes: dto.includes?.map((s) => s.trim()).filter(Boolean),
          imageUrl: trimOrNull(dto.imageUrl),
          minGuests: dto.minGuests ?? undefined,
          maxGuests: dto.maxGuests,
          // null clears the price (quote on request), undefined leaves it.
          price:
            dto.price === undefined
              ? undefined
              : dto.price === null
                ? null
                : new Prisma.Decimal(dto.price),
          priceUnit: dto.priceUnit ?? undefined,
          isActive: dto.isActive ?? undefined,
          sortOrder: dto.sortOrder ?? undefined,
        },
      }),
      'Package',
    );
    return toPackageAdmin(row);
  }

  /**
   * Deletes an unused package. A package with bookings is only deactivated
   * (isActive=false) and returned, so booking history keeps its packageId.
   */
  async deletePackage(id: string): Promise<{ id: string } | CateringPackageAdmin> {
    const used = await this.prisma.cateringBooking.count({ where: { packageId: id } });
    if (used > 0) {
      const row = await orNotFound(
        this.prisma.cateringPackage.update({
          where: { id },
          data: { isActive: false },
        }),
        'Package',
      );
      return toPackageAdmin(row);
    }
    try {
      await orNotFound(
        this.prisma.cateringPackage.delete({ where: { id } }),
        'Package',
      );
    } catch (e) {
      // A booking landed between the count and the delete: deactivate instead.
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2003') {
        const row = await this.prisma.cateringPackage.update({
          where: { id },
          data: { isActive: false },
        });
        return toPackageAdmin(row);
      }
      throw e;
    }
    return { id };
  }

  // ─── Gallery ────────────────────────────────────────────────────────────────

  async listGalleryPublic(): Promise<CateringGalleryImagePublic[]> {
    const rows = await this.prisma.cateringGalleryImage.findMany({
      where: { isActive: true },
      orderBy: SORT,
      take: 100,
    });
    return rows.map(toGalleryPublic);
  }

  async listGalleryAdmin() {
    const rows = await this.prisma.cateringGalleryImage.findMany({
      orderBy: SORT,
      take: 300,
    });
    return rows.map(toGalleryAdmin);
  }

  async createGalleryImage(dto: CreateCateringGalleryImageDto) {
    const row = await this.prisma.cateringGalleryImage.create({
      data: {
        imageUrl: dto.imageUrl.trim(),
        caption: trimOrNull(dto.caption) ?? null,
        isActive: dto.isActive ?? true,
        sortOrder: dto.sortOrder ?? 0,
      },
    });
    return toGalleryAdmin(row);
  }

  async updateGalleryImage(id: string, dto: UpdateCateringGalleryImageDto) {
    const row = await orNotFound(
      this.prisma.cateringGalleryImage.update({
        where: { id },
        data: {
          imageUrl: dto.imageUrl?.trim(),
          caption: trimOrNull(dto.caption),
          isActive: dto.isActive ?? undefined,
          sortOrder: dto.sortOrder ?? undefined,
        },
      }),
      'Image',
    );
    return toGalleryAdmin(row);
  }

  async deleteGalleryImage(id: string): Promise<{ id: string }> {
    await orNotFound(
      this.prisma.cateringGalleryImage.delete({ where: { id } }),
      'Image',
    );
    return { id };
  }

  // ─── Testimonials ───────────────────────────────────────────────────────────

  async listTestimonialsPublic(): Promise<CateringTestimonialPublic[]> {
    const rows = await this.prisma.cateringTestimonial.findMany({
      where: { isActive: true },
      orderBy: SORT,
      take: 50,
    });
    return rows.map(toTestimonialPublic);
  }

  async listTestimonialsAdmin() {
    const rows = await this.prisma.cateringTestimonial.findMany({
      orderBy: SORT,
      take: 300,
    });
    return rows.map(toTestimonialAdmin);
  }

  async createTestimonial(dto: CreateCateringTestimonialDto) {
    const row = await this.prisma.cateringTestimonial.create({
      data: {
        quote: dto.quote.trim(),
        name: dto.name.trim(),
        role: trimOrNull(dto.role) ?? null,
        isActive: dto.isActive ?? true,
        sortOrder: dto.sortOrder ?? 0,
      },
    });
    return toTestimonialAdmin(row);
  }

  async updateTestimonial(id: string, dto: UpdateCateringTestimonialDto) {
    const row = await orNotFound(
      this.prisma.cateringTestimonial.update({
        where: { id },
        data: {
          quote: dto.quote?.trim(),
          name: dto.name?.trim(),
          role: trimOrNull(dto.role),
          isActive: dto.isActive ?? undefined,
          sortOrder: dto.sortOrder ?? undefined,
        },
      }),
      'Testimonial',
    );
    return toTestimonialAdmin(row);
  }

  async deleteTestimonial(id: string): Promise<{ id: string }> {
    await orNotFound(
      this.prisma.cateringTestimonial.delete({ where: { id } }),
      'Testimonial',
    );
    return { id };
  }
}
