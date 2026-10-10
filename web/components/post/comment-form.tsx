'use client';

import { createCommentSchema, LIMITS } from '@fellow-owners/shared';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Field, TextArea } from '@/components/ui/field';

/** The comment box under the thread. Comment is the post screen's one coral action. */
export function CommentForm({
  onComment,
  className,
  submitVariant = 'primary',
}: {
  onComment: (body: string) => void;
  className?: string;
  submitVariant?: 'primary' | 'secondary';
}) {
  const {
    register,
    watch,
    reset,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(createCommentSchema),
    defaultValues: { body: '' },
    mode: 'onSubmit',
    reValidateMode: 'onChange',
  });

  return (
    <form
      noValidate
      aria-label="Add a comment"
      className={className}
      onSubmit={handleSubmit(({ body }) => {
        onComment(body);
        reset();
      })}
    >
      <Field
        label="Add a comment"
        count={{ value: watch('body').length, max: LIMITS.comment.body.max }}
        error={errors.body?.message}
      >
        <TextArea
          {...register('body')}
          rows={3}
          placeholder="Ask a question, or say how you could help"
        />
      </Field>
      <div className="mt-4 flex justify-end">
        <Button type="submit" variant={submitVariant} className="max-sm:w-full">
          Comment
        </Button>
      </div>
    </form>
  );
}
