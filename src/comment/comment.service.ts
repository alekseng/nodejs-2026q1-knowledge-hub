import { Injectable } from '@nestjs/common';
import { Comment } from './comment.interface';

@Injectable()
export class CommentService {
  private comments: Comment[] = [];
}
