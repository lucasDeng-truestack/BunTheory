import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { FeedbackService } from './feedback.service';
import { CreateFeedbackDto } from './dto/create-feedback.dto';
import { AdminAuthGuard } from '../../common/guards/admin-auth.guard';

@Controller('feedback')
export class FeedbackController {
  constructor(private readonly feedbackService: FeedbackService) {}

  @Get()
  @UseGuards(AdminAuthGuard)
  findAll() {
    return this.feedbackService.findAllForAdmin();
  }

  /** Public: optional post-checkout experience feedback. */
  @Post()
  create(@Body() dto: CreateFeedbackDto) {
    return this.feedbackService.create(dto);
  }
}
