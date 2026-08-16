"""
Kaizen Validators — Server-side validation for Kaizen data
"""

from django.core.exceptions import ValidationError
from django.utils import timezone
from datetime import date


def validate_suggestion_date(value):
    """Suggestion date cannot be in the future."""
    if value > date.today():
        raise ValidationError('Suggestion date cannot be in the future.')


def validate_implementation_date(value):
    """Implementation date cannot be in the future by more than 1 year."""
    max_future = date.today().replace(year=date.today().year + 1)
    if value > max_future:
        raise ValidationError('Implementation date seems unreasonable (more than 1 year in the future).')


def validate_cost_save(value):
    """Cost savings must be non-negative."""
    if value < 0:
        raise ValidationError('Cost savings cannot be negative.')


def validate_kaizen_for_submission(kaizen):
    """
    Validate all required fields before a Kaizen can be submitted.
    Returns a list of validation errors.
    """
    errors = {}

    if not kaizen.title or len(kaizen.title.strip()) < 5:
        errors['title'] = 'Title must be at least 5 characters.'

    if not kaizen.problem_before or len(kaizen.problem_before.strip()) < 10:
        errors['problem_before'] = 'Problem description must be at least 10 characters.'

    if not kaizen.counter_measure_after or len(kaizen.counter_measure_after.strip()) < 10:
        errors['counter_measure_after'] = 'Countermeasure description must be at least 10 characters.'

    if not kaizen.area:
        errors['area'] = 'Area is required.'

    if not kaizen.mini_factory:
        errors['mini_factory'] = 'Mini-factory is required.'

    if not kaizen.suggestion_date:
        errors['suggestion_date'] = 'Suggestion date is required.'

    if not kaizen.idea_by:
        errors['idea_by'] = 'Idea by (originator) is required.'

    # Check benefits exist
    if hasattr(kaizen, 'benefits'):
        benefits = kaizen.benefits
        if not any([
            benefits.productivity, benefits.quality, benefits.cost,
            benefits.delivery, benefits.safety, benefits.morale
        ]):
            errors['benefits'] = 'At least one benefit category must be selected.'

    return errors


VALID_STATUS_TRANSITIONS = {
    'draft': ['submitted'],
    'submitted': ['pending'],
    'pending': ['approved', 'good_point', 'rejected', 'rework'],
    'approved': ['closed'],
    'good_point': ['closed'],
    'rejected': [],
    'rework': ['submitted'],
    'closed': [],
}


def validate_status_transition(current_status, new_status):
    """
    Validate that a status transition is allowed.
    Raises ValidationError if the transition is invalid.
    """
    allowed = VALID_STATUS_TRANSITIONS.get(current_status, [])
    if new_status not in allowed:
        raise ValidationError(
            f'Invalid status transition from "{current_status}" to "{new_status}". '
            f'Allowed transitions: {", ".join(allowed) if allowed else "none (terminal state)"}.'
        )
